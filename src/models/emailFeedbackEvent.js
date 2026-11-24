const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  snsMessageId: { type: String, required: true, unique: true },
  messageId: { type: String, required: true },
  type: { type: String, required: true },
  recipients: [String],
  suppressed: Boolean,
}, { timestamps: true });

module.exports = mongoose.model("EmailFeedbackEvent", schema);
