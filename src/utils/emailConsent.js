const { randomBytes } = require("node:crypto");
const jwt = require("jsonwebtoken");
const { clientOrigin, jwtSecret } = require("../config/env");

const CONSENT_VERSION = "connection-emails-v1";
const CONSENT_TEXT = "Email me connection requests and daily pending-request reminders. I can unsubscribe at any time.";

const setEmailConsent = (user, enabled, source) => {
  user.emailConsent = {
    enabled, emailId: user.emailId, version: CONSENT_VERSION, source,
    revision: randomBytes(16).toString("hex"), updatedAt: new Date(),
    requestedAt: enabled ? new Date() : undefined,
    withdrawnAt: enabled ? undefined : new Date(),
    lastConfirmationAt: user.emailConsent?.lastConfirmationAt,
  };
};

const emailActionUrl = (user, action) => {
  const token = jwt.sign({
    sub: user._id.toString(), email: user.emailId, revision: user.emailConsent.revision, action,
  }, jwtSecret, { algorithm: "HS256", audience: "devtinder-email", expiresIn: action === "confirm" ? "7d" : "365d" });
  const url = new URL(`/api/email/${action}`, clientOrigin);
  url.searchParams.set("token", token);
  return url.href;
};

const readEmailAction = (token, action) => {
  const claims = jwt.verify(token, jwtSecret, { algorithms: ["HS256"], audience: "devtinder-email" });
  if (claims.action !== action || !/^[a-f0-9]{24}$/.test(claims.sub || "") || typeof claims.revision !== "string") {
    throw new Error("Invalid email action");
  }
  return claims;
};

const requestEmailConfirmation = async (user) => {
  if (!user.emailConsent?.enabled || user.emailConsent.confirmedAt) return { skipped: true };
  // Atomically throttle confirmation sends, including repeated clicks and concurrent requests.
  const User = require("../models/user");
  const claimed = await User.findOneAndUpdate({
    _id: user._id, "emailConsent.revision": user.emailConsent.revision,
    $or: [{ "emailConsent.lastConfirmationAt": { $exists: false } }, { "emailConsent.lastConfirmationAt": { $lt: new Date(Date.now() - 60000) } }],
  }, { $set: { "emailConsent.lastConfirmationAt": new Date() } }, { returnDocument: "after" });
  if (!claimed) return { skipped: true, reason: "Please wait a minute before requesting another confirmation." };
  try {
    return await require("./sendEmail").run("Confirm your DevTinder email notifications",
      `${CONSENT_TEXT}\n\nConfirm this request: ${emailActionUrl(claimed, "confirm")}\n\nIf you did not request this, ignore this email.`,
      { toAddress: claimed.emailId });
  } catch (error) {
    console.error("Email confirmation failed:", error.name);
    return { skipped: true, reason: "Confirmation could not be sent. Please try again later." };
  }
};

module.exports = { CONSENT_VERSION, CONSENT_TEXT, setEmailConsent, emailActionUrl, readEmailAction, requestEmailConfirmation };
