const User = require("../models/user");
const sendEmail = require("./sendEmail");
const { emailActionUrl } = require("./emailConsent");

const run = async (userId, subject, body) => {
  // Re-read consent at send time so a withdrawal also stops queued daily reminders.
  const user = await User.findById(userId);
  if (!user?.emailConsent?.enabled || !user.emailConsent.confirmedAt || user.emailConsent.emailId !== user.emailId) {
    return { skipped: true, reason: "Email consent is not confirmed" };
  }
  return sendEmail.run(subject, `${body}\n\nUnsubscribe: ${emailActionUrl(user, "unsubscribe")}\nEmail preferences: ${new URL("/profile", require("../config/env").clientOrigin).href}`, { toAddress: user.emailId });
};

module.exports = { run };
