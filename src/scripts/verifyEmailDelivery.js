const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const verifyEmailDelivery = async () => {
  if (!process.argv.includes("--send-to-configured-inbox")) {
    throw new Error("Explicit --send-to-configured-inbox approval is required; this test sends two real emails");
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
  const runId = randomBytes(16).toString("hex");
  const senderName = "DevTinderEmailTest" + runId.slice(0, 8);
  const temporaryPassword = randomBytes(24).toString("hex") + "aA1!";
  const report = { runId, startedAt: new Date().toISOString(), from: sesFromAddress, to: sesToAddress, productionScheduleUnchanged: productionSchedule };
  const temporaryUserIds = [];

  try {
    await connectDB();
    let recipient = await User.findOne({ emailId: sesToAddress.toLowerCase() }).select("_id");
    if (!recipient) {
      recipient = await User.create({ firstName: "EmailTestRecipient", lastName: "Temporary", emailId: sesToAddress, password: await bcrypt.hash(temporaryPassword, 10), about: "Temporary email verification " + runId });
      temporaryUserIds.push(recipient._id);
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
