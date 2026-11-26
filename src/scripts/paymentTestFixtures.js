const { randomBytes } = require("node:crypto");
const bcrypt = require("bcrypt");
const User = require("../models/user");
const Payment = require("../models/payment");
const Events = require("../models/paymentWebhookEvent");
const ConnectionRequest = require("../models/connectionRequest");
const { connectDB, disconnectDB } = require("../config/database");
const gateway = require("../utils/razorpay");

const run = async (action, runId) => {
  if (!/^[a-f0-9]{32}$/.test(runId || "") || !["create", "status", "refund", "cleanup"].includes(action)) throw new Error("An exact run ID and supported fixture action are required");
  if (gateway.getMode() !== "test" || !gateway.isConfigured()) throw new Error("This fixture can only use a configured Razorpay TEST account");
  await connectDB();
  const emailId = `e2e.${runId}.alpha@example.com`;
  let user = await User.findOne({ emailId });
  if (action === "create") {
    if (user) throw new Error("Fixture already exists");
    const password = randomBytes(16).toString("hex") + "aA1!";
    user = await User.create({ firstName: "PaymentTest", lastName: runId.slice(0, 8), emailId, password: await bcrypt.hash(password, 10), about: "Disposable Razorpay test fixture " + runId });
    const others = await User.find({ _id: { $ne: user._id } }).select("_id");
    if (others.length) await ConnectionRequest.bulkWrite(others.map(other => ({ insertOne: { document: { fromUserId: user._id, toUserId: other._id, status: "ignored" } } })));
    return { emailId, password, userId: user._id, mode: "test" };
  }
  if (!user) throw new Error("Fixture not found");
  const payments = await Payment.find({ userId: user._id });
  if (payments.some(p => p.mode !== "test")) throw new Error("Refusing to operate on a non-test payment");
  if (action === "status") {
    const eventCount = await Events.countDocuments({ orderId: { $in: payments.map(p => p.orderId).filter(Boolean) } });
    return { userId: user._id, isPremium: user.toJSON().isPremium, membershipType: user.toJSON().membershipType, payments: payments.map(p => ({ orderId: p.orderId, paymentId: p.paymentId, status: p.status, amount: p.amount, mode: p.mode, fulfilledAt: p.fulfilledAt, amountRefunded: p.amountRefunded })), webhookEvents: eventCount };
  }
  if (action === "refund") {
    if (!process.argv.includes("--allow-test-payment-api")) throw new Error("Explicit --allow-test-payment-api is required for a simulated refund");
    const payment = payments.find(p => p.paymentId && ["captured", "partially_refunded"].includes(p.status));
    if (!payment) throw new Error("No captured test payment found");
    const remote = await gateway.getClient().payments.fetch(payment.paymentId);
    const remaining = remote.amount - (remote.amount_refunded || 0);
    if (remaining <= 0) return { alreadyRefunded: true };
    const refund = await gateway.getClient().payments.refund(payment.paymentId, { amount: remaining, notes: { purpose: "DevTinder disposable test", runId } });
    return { refundId: refund.id, paymentId: payment.paymentId, status: refund.status, amount: refund.amount, mode: "test" };
  }
  const requests = await ConnectionRequest.deleteMany({ $or: [{ fromUserId: user._id }, { toUserId: user._id }] });
  const events = await Events.deleteMany({ orderId: { $in: payments.map(p => p.orderId).filter(Boolean) } });
  const deleted = await Payment.deleteMany({ userId: user._id, mode: "test" });
  await User.deleteOne({ _id: user._id, emailId });
  return { deletedTestUsers: 1, deletedTestRequests: requests.deletedCount, deletedTestPayments: deleted.deletedCount, deletedTestEvents: events.deletedCount };
};

if (require.main === module) {
  run(...process.argv.slice(2, 4)).then(value => console.log(JSON.stringify(value))).catch(error => {
    console.error(JSON.stringify({ error: error.error?.code || error.name || "RazorpayError", message: error.error?.description || error.message || "Unable to complete payment fixture action", status: error.statusCode }));
    process.exitCode = 1;
  }).finally(disconnectDB);
}

module.exports = { run };
