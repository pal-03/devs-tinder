const mongoose = require("mongoose");
const { addMonths } = require("date-fns");
const { createHmac, timingSafeEqual } = require("node:crypto");
const Payment = require("../models/payment");
const PaymentWebhookEvent = require("../models/paymentWebhookEvent");
const User = require("../models/user");
const gateway = require("./razorpay");
const { membershipView } = require("./membership");

const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const validSignature = (body, signature, secret) => {
  if (!secret || typeof signature !== "string" || !/^[a-f0-9]{64}$/.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(body).digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
};

const paymentView = payment => ({
  orderId: payment.orderId, membershipType: payment.membershipType, amount: payment.amount,
  currency: payment.currency, status: payment.status, mode: payment.mode, createdAt: payment.createdAt,
  fulfilledAt: payment.fulfilledAt, expiresAt: payment.membershipExpiresAt, amountRefunded: payment.amountRefunded,
});

const refreshMembership = async (userId, mode, session) => {
  const latest = await Payment.findOne({ userId, mode, status: { $in: ["captured", "partially_refunded"] }, membershipExpiresAt: { $gt: new Date() } })
    .sort({ fulfilledAt: -1, _id: -1 }).session(session);
  await User.updateOne({ _id: userId }, { $set: {
    [`memberships.${mode}`]: { active: Boolean(latest), type: latest?.membershipType || null, expiresAt: latest?.membershipExpiresAt || null },
    isPremium: Boolean(latest), membershipType: latest?.membershipType || null,
    membershipExpiresAt: latest?.membershipExpiresAt || null, membershipMode: mode,
  } }, { session });
};

const fetchGatewayPayment = async (payment, paymentId) => {
  const client = gateway.getClient();
  if (paymentId) return client.payments.fetch(paymentId);
  const result = await client.orders.fetchPayments(payment.orderId);
  return result.items.find(item => ["captured", "refunded"].includes(item.status))
    || result.items.find(item => item.status === "authorized") || result.items.at(-1);
};

const reconcilePayment = async (payment, { paymentId, event } = {}) => {
  if (payment.mode !== gateway.getMode()) throw fail("Payment belongs to a different gateway mode", 409);
  const remote = await fetchGatewayPayment(payment, paymentId);
  if (remote && (remote.order_id !== payment.orderId || remote.amount !== payment.amount || remote.currency !== payment.currency)) {
    throw fail("Payment does not match the stored order");
  }
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      if (event && await PaymentWebhookEvent.exists({ eventId: event.eventId }).session(session)) return;
      const current = await Payment.findById(payment._id).session(session);
      if (!current) throw fail("Payment order not found", 404);
      if (remote) {
        const refunded = Math.max(current.amountRefunded, Number(remote.amount_refunded || 0));
        if (refunded > 0 && refunded >= current.amount) {
          current.status = "refunded";
          current.paymentId = remote.id;
          current.amountRefunded = refunded;
        } else if (current.status !== "refunded" && remote.status === "captured" && remote.captured === true) {
          current.status = refunded ? "partially_refunded" : "captured";
          current.paymentId = remote.id;
          current.amountRefunded = Math.max(current.amountRefunded, refunded);
          // Browser callbacks, retries and webhooks all share this once-only fulfilment.
          if (!current.fulfilledAt) {
            current.fulfilledAt = new Date();
            current.membershipExpiresAt = addMonths(current.fulfilledAt, current.durationMonths);
          }
        } else if (!current.fulfilledAt && ["created", "authorized", "failed"].includes(remote.status)) {
          current.status = remote.status;
        }
        await current.save({ session });
        await refreshMembership(current.userId, current.mode, session);
      }
      if (event) await PaymentWebhookEvent.create([{ ...event, orderId: current.orderId, paymentId: remote?.id, result: current.status }], { session });
    });
  } finally {
    await session.endSession();
  }
  const updated = await Payment.findById(payment._id);
  const user = await User.findById(payment.userId);
  return { payment: paymentView(updated), membership: membershipView(user) };
};

module.exports = { validSignature, paymentView, reconcilePayment, fail };
