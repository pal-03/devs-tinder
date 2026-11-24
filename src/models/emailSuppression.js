const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  emailId: { type: String, required: true, unique: true, lowercase: true, trim: true },
  reason: { type: String, required: true, enum: ["BOUNCE", "COMPLAINT"] },
  feedbackId: String,
  messageId: String,
}, { timestamps: true });

module.exports = mongoose.model("EmailSuppression", schema);
