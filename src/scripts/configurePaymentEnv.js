const fs = require("node:fs");

const configure = input => {
  const allowed = ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET", "RAZORPAY_MODE", "RAZORPAY_LIVE_ENABLED"];
  if (Object.keys(input).some(key => !allowed.includes(key)) || !input.RAZORPAY_KEY_ID?.startsWith("rzp_test_")
    || typeof input.RAZORPAY_KEY_SECRET !== "string" || input.RAZORPAY_KEY_SECRET.length < 10
    || typeof input.RAZORPAY_WEBHOOK_SECRET !== "string" || input.RAZORPAY_WEBHOOK_SECRET.length < 12
    || input.RAZORPAY_MODE !== "test" || input.RAZORPAY_LIVE_ENABLED !== "false") {
    throw new Error("Only a complete TEST-mode payment configuration is accepted by this deployment helper");
  }
  let contents = fs.readFileSync(".env", "utf8");
  for (const key of allowed) {
    const pattern = new RegExp("^" + key + "=.*$", "m");
    const line = key + "=" + JSON.stringify(input[key]);
    contents = pattern.test(contents) ? contents.replace(pattern, () => line) : contents.trimEnd() + "\n" + line + "\n";
  }
  fs.writeFileSync(".env", contents, { mode: 0o600 });
  fs.chmodSync(".env", 0o600);
  return { updatedSettings: allowed, mode: "test", livePaymentsEnabled: false, secretsPrinted: false };
};

if (require.main === module) {
  try { console.log(JSON.stringify(configure(JSON.parse(fs.readFileSync(0, "utf8"))))); }
  catch (error) { console.error(error instanceof SyntaxError ? "Invalid payment environment JSON" : error.message); process.exitCode = 1; }
}

module.exports = { configure };
