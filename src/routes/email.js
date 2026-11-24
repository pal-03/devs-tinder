const express = require("express");
const User = require("../models/user");
const EmailSuppression = require("../models/emailSuppression");
const { userAuth } = require("../middlewares/auth");
const { setEmailConsent, readEmailAction, requestEmailConfirmation } = require("../utils/emailConsent");
const { clientOrigin } = require("../config/env");
const router = express.Router();

router.patch("/profile/email-preferences", userAuth, async (req, res) => {
  if (typeof req.body?.enabled !== "boolean" || Object.keys(req.body).some(key => key !== "enabled")) {
    return res.status(400).json({ message: "enabled must be a boolean, with no additional fields" });
  }
  try {
    const user = req.user;
    if (req.body.enabled && await EmailSuppression.exists({ emailId: user.emailId })) {
      return res.status(409).json({ message: "Email delivery is paused after a bounce or spam complaint. Contact support before enabling it again." });
    }
    if (!req.body.enabled || !user.emailConsent?.enabled || user.emailConsent.emailId !== user.emailId) {
      setEmailConsent(user, req.body.enabled, "profile");
      await user.save();
    }
    const confirmation = req.body.enabled ? await requestEmailConfirmation(user) : undefined;
    res.json({ data: await User.findById(user._id).select("-password"), confirmation });
  } catch {
    res.status(500).json({ message: "Unable to update email preferences" });
  }
});

const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const page = (title, content) => `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} | DevTinder</title><style>body{margin:0;background:#1d232a;color:#eee;font:16px system-ui}main{max-width:480px;margin:72px auto;padding:24px}h1{font-size:24px}button,a{color:inherit}button{background:#4b4ac9;border:0;border-radius:6px;padding:12px 18px;font:inherit;cursor:pointer}p{line-height:1.6;overflow-wrap:anywhere}a{display:inline-block;margin-top:24px}</style><main><h1>${title}</h1>${content}<a href="${escapeHtml(new URL("/profile", clientOrigin).href)}">Back to DevTinder</a></main></html>`;

for (const action of ["confirm", "unsubscribe"]) {
  router.all(`/email/${action}`, express.urlencoded({ extended: false, limit: "8kb" }), async (req, res) => {
    res.set({ "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'" });
    if (!["GET", "POST"].includes(req.method)) return res.sendStatus(405);
    try {
      const token = req.method === "POST" ? req.body.token : req.query.token;
      const claims = readEmailAction(token, action);
      const filter = { _id: claims.sub, emailId: claims.email, "emailConsent.revision": claims.revision };
      const user = await User.findOne(filter);
      if (!user) throw new Error("Expired email preference link");
      const title = action === "confirm" ? "Confirm email notifications" : "Unsubscribe from emails";
      if (req.method === "GET") {
        // Link previews and email security scanners must never change consent.
        return res.type("html").send(page(title, `<p>${action === "confirm" ? "Enable connection request notifications and daily pending-request reminders?" : "Stop connection request notifications and daily pending-request reminders?"}</p><form method="post"><input type="hidden" name="token" value="${escapeHtml(token)}"><button type="submit">${action === "confirm" ? "Confirm notifications" : "Unsubscribe"}</button></form>`));
      }
      if (action === "confirm") {
        if (await EmailSuppression.exists({ emailId: user.emailId })) return res.status(409).type("html").send(page("Email delivery paused", "<p>This address is suppressed after a bounce or complaint. Contact support.</p>"));
        const updated = await User.updateOne({ ...filter, "emailConsent.enabled": true }, { $set: { "emailConsent.confirmedAt": new Date(), "emailConsent.updatedAt": new Date() } });
        if (!updated.matchedCount) throw new Error("Consent request no longer active");
      } else {
        // Conditional update prevents a stale link from withdrawing a newer opt-in.
        await User.updateOne(filter, { $set: { "emailConsent.enabled": false, "emailConsent.withdrawnAt": new Date(), "emailConsent.updatedAt": new Date() }, $unset: { "emailConsent.confirmedAt": "" } });
      }
      res.type("html").send(page(action === "confirm" ? "Email notifications confirmed" : "You are unsubscribed", "<p>Your email preferences have been saved.</p>"));
    } catch {
      res.status(400).type("html").send(page("Invalid or expired link", "<p>Open your profile to update email preferences or request a new confirmation.</p>"));
    }
  });
}

module.exports = router;
