const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  orderId: String,
  paymentId: String,
  result: String,
}, { timestamps: true });

module.exports = mongoose.model("PaymentWebhookEvent", schema);
