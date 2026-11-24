const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const verifyEmailDelivery = async () => {
  if (!process.argv.includes("--send-to-configured-inbox")) {
    throw new Error("Explicit --send-to-configured-inbox approval is required; this test sends confirmation, notification, reminder and simulator emails");
  }

  require("dotenv").config({ quiet: true });
  const productionSchedule = process.env.CRON_EXPRESSION || "0 8 * * *";
  process.env.CRON_EXPRESSION = "*/10 * * * * *";
  process.env.DISABLE_CRON = "false";
  process.env.DISABLE_EMAILS = "false";

  const mongoose = require("mongoose");
  const bcrypt = require("bcrypt");
  const User = require("../models/user");
  const ConnectionRequest = require("../models/connectionRequest");
  const { connectDB, disconnectDB } = require("../config/database");
  const { clientOrigin, sesToAddress, sesFromAddress, awsRegion } = require("../config/env");
  const { startCronJob, stopCronJob } = require("../utils/cronJob");
  const { emailActionUrl } = require("../utils/emailConsent");
  const EmailSuppression = require("../models/emailSuppression");
  const EmailFeedbackEvent = require("../models/emailFeedbackEvent");
  const simulatorEmails = ["bounce@simulator.amazonses.com", "complaint@simulator.amazonses.com"];
  const runId = randomBytes(16).toString("hex");
  const senderName = "DevTinderEmailTest" + runId.slice(0, 8);
  const temporaryPassword = randomBytes(24).toString("hex") + "aA1!";
  const report = { runId, startedAt: new Date().toISOString(), from: sesFromAddress, to: sesToAddress, productionScheduleUnchanged: productionSchedule };
  const temporaryUserIds = [];

  try {
    await connectDB();
    let recipient = await User.findOne({ emailId: sesToAddress.toLowerCase() });
    if (!recipient) {
      recipient = await User.create({ firstName: "EmailTestRecipient", lastName: "Temporary", emailId: sesToAddress, password: await bcrypt.hash(temporaryPassword, 10), about: "Temporary email verification " + runId });
      temporaryUserIds.push(recipient._id);
    }
    if (!temporaryUserIds.some(id => id.equals(recipient._id)) && (!recipient.emailConsent?.enabled || !recipient.emailConsent.confirmedAt)) {
      throw new Error("The existing inbox account must opt in and confirm from its profile first; this test will not change a real user's consent");
    }
    if (temporaryUserIds.some(id => id.equals(recipient._id))) {
      const recipientCookie = "token=" + await recipient.getJWT();
      const consent = await fetch(new URL("/api/profile/email-preferences", clientOrigin), { method: "PATCH", headers: { "Content-Type": "application/json", Cookie: recipientCookie }, body: JSON.stringify({ enabled: true }), signal: AbortSignal.timeout(30000) });
      const consentBody = await consent.json();
      assert.equal(consent.status, 200);
      assert.ok(consentBody.confirmation.MessageId, JSON.stringify(consentBody));
      recipient = await User.findById(recipient._id);
      report.confirmation = { subject: "Confirm your DevTinder email notifications", messageId: consentBody.confirmation.MessageId };
      const confirmUrl = emailActionUrl(recipient, "confirm");
      const confirmPage = await fetch(confirmUrl, { signal: AbortSignal.timeout(20000) });
      assert.equal(confirmPage.status, 200);
      assert.match(await confirmPage.text(), /Confirm notifications/);
      assert.equal((await User.findById(recipient._id)).emailConsent.confirmedAt, undefined);
      if (process.argv.includes("--await-inbox-confirmation")) {
        console.log("CONFIRMATION_READY", JSON.stringify(report.confirmation));
        const deadline = Date.now() + 300000;
        while (Date.now() < deadline && !(await User.findById(recipient._id)).emailConsent.confirmedAt) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } else {
        const confirm = await fetch(confirmUrl.split("?")[0], { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ token: new URL(confirmUrl).searchParams.get("token") }), signal: AbortSignal.timeout(20000) });
        assert.equal(confirm.status, 200);
      }
      recipient = await User.findById(recipient._id);
      assert.ok(recipient.emailConsent.confirmedAt);
      report.consent = { doubleOptInConfirmed: true, source: recipient.emailConsent.source, version: recipient.emailConsent.version };
    }

    const signup = await fetch(new URL("/api/signup", clientOrigin), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName: senderName, lastName: "Temporary", emailId: `e2e.${runId}.alpha@example.com`, password: temporaryPassword }),
      signal: AbortSignal.timeout(20000),
    });
    const signupBody = await signup.json();
    assert.equal(signup.status, 201, JSON.stringify(signupBody));
    const sender = signupBody.data;
    const senderId = new mongoose.Types.ObjectId(sender._id);
    temporaryUserIds.push(senderId);
    const cookie = signup.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
    assert.ok(cookie, "Signup did not return an authentication cookie");

    const others = await User.find({ _id: { $nin: [senderId, recipient._id] } }).select("_id");
    const isolation = others.map((other) => ({ insertOne: { document: { fromUserId: senderId, toUserId: other._id, status: "ignored" } } }));
    if (isolation.length) await ConnectionRequest.bulkWrite(isolation);

    const notification = await fetch(new URL(`/api/request/send/interested/${recipient._id}`, clientOrigin), {
      method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie }, body: "{}", signal: AbortSignal.timeout(30000),
    });
    const notificationBody = await notification.json();
    assert.equal(notification.status, 200, JSON.stringify(notificationBody));
    assert.equal(notificationBody.email.sent, true, JSON.stringify(notificationBody.email));
    const requestId = new mongoose.Types.ObjectId(notificationBody.data._id);
    report.notification = { subject: "A new friend request from " + senderName, messageId: notificationBody.email.messageId };
    console.log("Notification accepted:", JSON.stringify(report.notification));

    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    yesterday.setUTCHours(12, 0, 0, 0);
    const update = await ConnectionRequest.collection.updateOne({ _id: requestId, fromUserId: senderId, toUserId: recipient._id, status: "interested" }, { $set: { createdAt: yesterday } });
    assert.equal(update.matchedCount, 1);

    // This is a real scheduled tick, restricted to the one temporary request.
    const task = startCronJob({ requestIds: [requestId] });
    assert.ok(task);
    const execution = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Scheduled reminder did not finish within 40 seconds")), 40000);
      task.once("execution:finished", (context) => { clearTimeout(timeout); resolve(context.execution); });
      task.once("execution:failed", (context) => { clearTimeout(timeout); reject(context.execution.error); });
    });
    stopCronJob();
    assert.equal(execution.reason, "scheduled");
    assert.equal(execution.result.pendingRequestsCount, 1);
    assert.equal(execution.result.recipientCount, 1);
    assert.equal(execution.result.results[0].sent, true, JSON.stringify(execution.result.results));
    report.reminder = { reason: execution.reason, subject: "New Friend Requests pending for " + sesToAddress, messageId: execution.result.results[0].messageId, finishedAt: execution.finishedAt };
    report.messageIdDomain = awsRegion + ".amazonses.com";
    console.log("Scheduled reminder accepted:", JSON.stringify(report.reminder));
    if (temporaryUserIds.some(id => id.equals(recipient._id))) {
      const unsubscribeUrl = emailActionUrl(recipient, "unsubscribe");
      assert.equal((await fetch(unsubscribeUrl)).status, 200);
      assert.equal((await User.findById(recipient._id)).emailConsent.enabled, true);
      const unsubscribe = await fetch(unsubscribeUrl.split("?")[0], { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ token: new URL(unsubscribeUrl).searchParams.get("token") }), signal: AbortSignal.timeout(20000) });
      assert.equal(unsubscribe.status, 200);
      await ConnectionRequest.deleteOne({ _id: requestId, fromUserId: senderId, toUserId: recipient._id });
      const stopped = await fetch(new URL(`/api/request/send/interested/${recipient._id}`, clientOrigin), { method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie }, body: "{}", signal: AbortSignal.timeout(30000) });
      const stoppedBody = await stopped.json();
      assert.equal(stopped.status, 200);
      assert.equal(stoppedBody.email.skipped, true);
      await ConnectionRequest.collection.updateOne({ _id: new mongoose.Types.ObjectId(stoppedBody.data._id) }, { $set: { createdAt: yesterday } });
      const reminder = await require("../utils/cronJob").sendPendingConnectionRequestEmails({ requestIds: [new mongoose.Types.ObjectId(stoppedBody.data._id)] });
      assert.equal(reminder.recipientCount, 0);
      report.withdrawal = { scannerSafeGet: true, notificationSkipped: true, reminderSkipped: true };
    }
    // These are AWS-owned test addresses, never real recipient addresses.
    await EmailSuppression.deleteMany({ emailId: { $in: simulatorEmails } });
    report.feedback = [];
    for (const email of simulatorEmails) {
      const result = await require("../utils/sendEmail").run("DevTinder feedback verification " + runId, "SES mailbox simulator test", email);
      assert.ok(result.MessageId);
      const deadline = Date.now() + 90000;
      let suppression;
      while (Date.now() < deadline) {
        suppression = await EmailSuppression.findOne({ emailId: email, messageId: result.MessageId });
        if (suppression) break;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      assert.ok(suppression, "Feedback did not reach the deployed consumer for " + email);
      const audit = await EmailFeedbackEvent.findOne({ messageId: result.MessageId, suppressed: true });
      assert.ok(audit);
      const stopped = await require("../utils/sendEmail").run("Must not send", "Suppression guard test", email);
      assert.equal(stopped.skipped, true);
      report.feedback.push({ email, reason: suppression.reason, sesMessageId: result.MessageId, audited: true, subsequentSendBlocked: true });
    }
  } catch (error) {
    report.error = { name: error.name, message: error.message };
    throw error;
  } finally {
    stopCronJob();
    if (temporaryUserIds.length) {
      const requests = await ConnectionRequest.deleteMany({ $or: [{ fromUserId: { $in: temporaryUserIds } }, { toUserId: { $in: temporaryUserIds } }] });
      const users = await User.deleteMany({ _id: { $in: temporaryUserIds } });
      report.cleanup = { deletedTemporaryUsers: users.deletedCount, deletedTemporaryRequests: requests.deletedCount };
    }
    await EmailSuppression.deleteMany({ emailId: { $in: simulatorEmails } });
    await disconnectDB();
    report.completedAt = new Date().toISOString();
    const directory = path.resolve("artifacts", "email-e2e");
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, runId + ".json"), JSON.stringify(report, null, 2));
    console.log("EMAIL_E2E_REPORT", JSON.stringify(report));
  }
};

if (require.main === module) {
  verifyEmailDelivery().catch((error) => {
    console.error(error.name + ": " + error.message);
    process.exitCode = 1;
  });
}
