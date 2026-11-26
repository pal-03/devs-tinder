const express = require("express");
const { userAuth } = require("../middlewares/auth");
const paymentRouter = express.Router();
const razorpayInstance = require("../utils/razorpay"); // Import the
//  Razorpay instance from the utils/razorpay.js file
const Payment = require("../models/payment");
const User = require("../models/user");
const PaymentWebhookEvent = require("../models/paymentWebhookEvent");
const { membershipAmount, membershipMonths } = require("../utils/constants");
const { razorpayKeyId, razorpayKeySecret, razorpayWebhookSecret } = require("../config/env");
const { membershipView } = require("../utils/membership");
const { validSignature, paymentView, reconcilePayment, fail } = require("../utils/paymentService");

const handleError = (res, error) => {
  console.error("Payment operation failed:", { name: error.name, status: error.status || error.statusCode });
  return res.status(error.status || 502).json({ message: error.status ? error.message : "Payment service is temporarily unavailable. Check payment status before trying again." });
};
const checkoutView = payment => ({
  ...paymentView(payment), keyId: razorpayKeyId,
  notes: { firstName: payment.notes.firstName, lastName: payment.notes.lastName, emailId: payment.notes.emailId },
});

paymentRouter.get("/payment/membership", userAuth, async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user._id, mode: razorpayInstance.getMode() }).sort({ createdAt: -1 }).limit(10);
    res.json({ enabled: razorpayInstance.isConfigured(), mode: razorpayInstance.getMode(), membership: membershipView(req.user),
      plans: Object.keys(membershipAmount).map(type => ({ type, amount: membershipAmount[type] * 100, currency: "INR", months: membershipMonths[type] })),
      payments: payments.map(paymentView) });
  } catch (error) { handleError(res, error); }
});

// this is the route to create a payment order and
//  save it in the database
// This route is protected by the userAuth middleware
paymentRouter.post("/payment/create", userAuth, async (req, res) => {
  try {
    const { membershipType } = req.body || {};
    if (typeof membershipType !== "string" || !Object.hasOwn(membershipAmount, membershipType)) throw fail("Choose a valid membership plan");
    if (Object.keys(req.body).some(key => key !== "membershipType")) throw fail("Only membershipType may be provided");
    const requestId = req.get("Idempotency-Key");
    if (!/^[a-zA-Z0-9_-]{16,100}$/.test(requestId || "")) throw fail("A valid Idempotency-Key is required");
    if (!razorpayInstance.isConfigured()) throw fail("Payments are not configured", 503);
    const existing = await Payment.findOne({ userId: req.user._id, requestId });
    if (existing) {
      if (existing.membershipType !== membershipType || existing.mode !== razorpayInstance.getMode()) throw fail("Checkout request was used for another plan or mode", 409);
      if (!existing.orderId) throw fail("Order creation is pending or failed. Check status before starting a new checkout.", 409);
      return res.json(checkoutView(existing));
    }
    if (membershipView(req.user).active) throw fail("Your membership is already active", 409);
    const { firstName, lastName, emailId } = req.user; // Get the user details from the request object
    const payment = new Payment({
      userId: req.user._id, membershipType, durationMonths: membershipMonths[membershipType], mode: razorpayInstance.getMode(), requestId,
      amount: membershipAmount[membershipType] * 100, currency: "INR", status: "creating",
      notes: { firstName, lastName, emailId, membershipType },
    });
    payment.receipt = "dt_" + payment._id;
    // Save it in my database before contacting the gateway, so concurrent retries cannot create two orders.
    await payment.save();
    try {
      // Create an order using the Razorpay instance
      const order = await razorpayInstance.getClient().orders.create({
        amount: payment.amount, currency: payment.currency, receipt: payment.receipt,
        // Add the user details to the notes field of the order
        notes: { userId: req.user._id.toString(), membershipType },
      });
      if (!order.id || order.amount !== payment.amount || order.currency !== payment.currency) throw new Error("Unexpected gateway order");
      payment.orderId = order.id;
      payment.status = "created";
      // Save the payment document in the database
      await payment.save();
      // Return back my order details to frontend (the public key ID, never the secret).
      return res.json(checkoutView(payment));
    } catch (error) {
      await Payment.updateOne({ _id: payment._id }, { $set: { status: "create_failed" } });
      throw error;
    }
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "This checkout is already being created. Please check status." });
    handleError(res, error);
  }
});

paymentRouter.post("/payment/verify", userAuth, async (req, res) => {
  try {
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body || {};
    if (!/^order_[a-zA-Z0-9]+$/.test(orderId || "") || !/^pay_[a-zA-Z0-9]+$/.test(paymentId || "")) throw fail("Invalid payment reference");
    const payment = await Payment.findOne({ orderId, userId: req.user._id });
    if (!payment) throw fail("Payment order not found", 404);
    // The order ID comes from our database, not an untrusted Checkout amount or plan.
    if (!validSignature(`${payment.orderId}|${paymentId}`, signature, razorpayKeySecret)) throw fail("Payment signature is invalid");
    const result = await reconcilePayment(payment, { paymentId });
    res.status(result.payment.fulfilledAt ? 200 : 202).json(result);
  } catch (error) { handleError(res, error); }
});

paymentRouter.get("/payment/status/:orderId", userAuth, async (req, res) => {
  try {
    const payment = await Payment.findOne({ orderId: req.params.orderId, userId: req.user._id });
    if (!payment) throw fail("Payment order not found", 404);
    // This recovers a captured payment when the browser callback or webhook was delayed.
    res.json(await reconcilePayment(payment));
  } catch (error) { handleError(res, error); }
});

// this is the route to handle the webhook from Razorpay
//  and update my database
// Webhooks do not use userAuth: Razorpay authenticates them with a signature over the raw body.
paymentRouter.post("/payment/webhook", async (req, res) => {
  try {
    if (!razorpayInstance.isConfigured()) throw fail("Payments are not configured", 503);
    const webhookSignature = req.get("X-Razorpay-Signature");
    // Get the webhook signature from the request header
    // Validate the webhook signature using the original bytes, not JSON.stringify(req.body).
    if (!Buffer.isBuffer(req.body) || !validSignature(req.body, webhookSignature, razorpayWebhookSecret)) throw fail("Webhook signature is invalid");
    const eventId = req.get("x-razorpay-event-id");
    if (!eventId || eventId.length > 200) throw fail("Webhook event ID is required");
    if (await PaymentWebhookEvent.exists({ eventId })) return res.json({ duplicate: true });
    const body = JSON.parse(req.body.toString("utf8"));
    // Handle different events from Razorpay
    // For example, if the payment is captured,
    //  you can update the payment status in the database
    // if (req.body.event == "payment.captured") {
    // }
    // if (req.body.event == "payment.failed") {
    // }
    if (!["payment.captured", "payment.authorized", "payment.failed", "order.paid", "refund.processed"].includes(body.event)) return res.json({ ignored: true });
    // Get the payment details from the request body
    // The payment details are sent in the request body by Razorpay.
    const paymentDetails = body.payload?.payment?.entity;
    const refund = body.payload?.refund?.entity;
    let orderId = paymentDetails?.order_id || body.payload?.order?.entity?.id;
    let paymentId = paymentDetails?.id;
    if (body.event === "refund.processed" && refund?.payment_id) {
      paymentId = refund.payment_id;
      orderId = (await razorpayInstance.getClient().payments.fetch(paymentId)).order_id;
    }
    if (typeof orderId !== "string") throw fail("Webhook has no order reference");
    const payment = await Payment.findOne({ orderId });
    if (!payment) {
      await PaymentWebhookEvent.create({ eventId, type: body.event, orderId, paymentId, result: "unknown_order" });
      return res.json({ ignored: true });
    }
    // Update my payment Status in DB.
    // Update the user as premium only after a captured, matching payment has been verified.
    // Get the user details from the payment document; the user details are stored in its notes.
    await reconcilePayment(payment, { paymentId, event: { eventId, type: body.event } });
    // return success response to razorpay only after the transaction committed.
    return res.json({ message: "Webhook received successfully" });
  } catch (error) {
    if (error.code === 11000) return res.json({ duplicate: true });
    if (error instanceof SyntaxError) return res.status(400).json({ message: "Invalid webhook payload" });
    handleError(res, error);
  }
});

module.exports = paymentRouter;
