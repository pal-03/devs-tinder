const Razorpay = require("razorpay");
const config = require("../config/env");
let client;

const getMode = () => config.razorpayMode;
const isConfigured = () => ["test", "live"].includes(getMode())
  && config.razorpayKeyId.startsWith(`rzp_${getMode()}_`)
  && Boolean(config.razorpayKeySecret && config.razorpayWebhookSecret)
  && (getMode() !== "live" || config.razorpayLiveEnabled);

const getClient = () => {
  if (!isConfigured()) throw Object.assign(new Error("Payments are not configured"), { status: 503 });
  client ||= new Razorpay({ key_id: config.razorpayKeyId, key_secret: config.razorpayKeySecret });
  return client;
};

module.exports = { getClient, getMode, isConfigured };
