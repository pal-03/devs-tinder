const assert = require("node:assert/strict");
const { before, after, afterEach, test, mock } = require("node:test");
const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
let mongo, server, User, Suppression, Events, sendEmail, sent;
const payload = emailId => ({ firstName: "Consent", lastName: "Test", emailId, password: "StrongP@ss1" });
const tokenFrom = body => new URL(body.match(/https?:\/\/\S+\/api\/email\/confirm\?token=\S+/)[0]).searchParams.get("token");

before(async () => {
  mongo = await MongoMemoryServer.create();
  Object.assign(process.env, { MONGODB_URI: mongo.getUri(), JWT_SECRET: "email-test-secret", DISABLE_CRON: "true", DISABLE_EMAILS: "false", SES_FEEDBACK_QUEUE_URL: "", SES_FEEDBACK_TOPIC_ARN: "" });
  User = require("../src/models/user");
  Suppression = require("../src/models/emailSuppression");
  Events = require("../src/models/emailFeedbackEvent");
  server = await require("../src/app").startServer({ port: 0 });
  await Promise.all([Suppression.init(), Events.init()]);
  sendEmail = require("../src/utils/sendEmail");
});
afterEach(async () => { mock.restoreAll(); await Promise.all([User.deleteMany({}), Suppression.deleteMany({}), Events.deleteMany({}), require("../src/models/connectionRequest").deleteMany({})]); });
after(async () => { await require("../src/app").stopServer(); await require("../src/config/database").disconnectDB(); await mongo.stop(); });

const capture = () => {
  sent = [];
  mock.method(sendEmail, "run", async (...args) => { sent.push(args); return { MessageId: "test-message" }; });
};

test("signup defaults off, validates consent, and does not accept forged consent metadata", async () => {
  capture();
  const user = await request(server).post("/signup").send({ ...payload("default@example.com"), emailConsent: { enabled: true, confirmedAt: new Date() } }).expect(201);
  assert.equal(user.body.data.emailConsent.enabled, false);
  assert.equal(sent.length, 0);
  await request(server).post("/signup").send({ ...payload("invalid@example.com"), emailNotifications: "true" }).expect(400);
});

test("double opt-in, confirmation cooldown, scanner-safe links, unsubscribe, and stale tokens", async () => {
  capture();
  const agent = request.agent(server);
  const user = await agent.post("/signup").send({ ...payload("optin@example.com"), emailNotifications: true }).expect(201);
  assert.equal(sent.length, 1);
  const token = tokenFrom(sent[0][1]);
  const query = "?token=" + encodeURIComponent(token);
  assert.equal(user.body.data.emailConsent.source, "signup");
  assert.equal(user.body.data.emailConsent.version, "connection-emails-v1");
  await request(server).get("/email/confirm" + query).expect(200);
  assert.equal((await User.findById(user.body.data._id)).emailConsent.confirmedAt, undefined);
  await agent.patch("/profile/email-preferences").send({ enabled: true }).expect(200);
  assert.equal(sent.length, 1, "Confirmation cooldown failed");
  const notify = require("../src/utils/emailNotifications");
  assert.equal((await notify.run(user.body.data._id, "Before", "Body")).skipped, true);
  await request(server).post("/email/confirm").type("form").send({ token }).expect(200);
  const confirmed = await User.findById(user.body.data._id);
  assert.ok(confirmed.emailConsent.confirmedAt);
  await notify.run(confirmed._id, "After", "Body");
  assert.equal(sent.length, 2);
  const unsubscribe = new URL(sent[1][1].match(/Unsubscribe: (\S+)/)[1]);
  const unsubscribeToken = unsubscribe.searchParams.get("token");
  await request(server).get("/email/unsubscribe?token=" + encodeURIComponent(unsubscribeToken)).expect(200);
  assert.equal((await User.findById(confirmed._id)).emailConsent.enabled, true);
  await request(server).post("/email/unsubscribe").type("form").send({ token: unsubscribeToken }).expect(200);
  assert.equal((await notify.run(confirmed._id, "Stopped", "Body")).skipped, true);
  await request(server).post("/email/confirm").type("form").send({ token }).expect(400);
  await agent.patch("/profile/email-preferences").send({ enabled: true }).expect(200);
  await request(server).post("/email/confirm").type("form").send({ token }).expect(400);
  await agent.patch("/profile/edit").send({ emailConsent: { enabled: true } }).expect(400);
  await agent.patch("/profile/email-preferences").send({ enabled: "false" }).expect(400);
  await request(server).patch("/profile/email-preferences").send({ enabled: true }).expect(401);
});

test("email changes revoke consent, and feedback blocks opt-in and confirmation", async () => {
  capture();
  const agent = request.agent(server);
  const result = await agent.post("/signup").send({ ...payload("old@example.com"), emailNotifications: true }).expect(201);
  const token = tokenFrom(sent[0][1]);
  await agent.patch("/profile/edit").send({ emailId: "new@example.com" }).expect(200);
  assert.equal((await User.findById(result.body.data._id)).emailConsent.enabled, false);
  await request(server).post("/email/confirm").send({ token }).expect(400);
  await Suppression.create({ emailId: "new@example.com", reason: "COMPLAINT" });
  await agent.patch("/profile/email-preferences").send({ enabled: true }).expect(409);
});

const feedback = (id, type, subtype = "Permanent") => JSON.stringify({ Type: "Notification", TopicArn: "arn:aws:sns:ap-southeast-2:123456789012:feedback", MessageId: id, Message: JSON.stringify({
  notificationType: type, mail: { source: "swayam@devs-tinder.in", messageId: "ses-" + id },
  bounce: { bounceType: subtype, bouncedRecipients: [{ emailAddress: "bad@example.com" }], feedbackId: id },
  complaint: { complaintFeedbackType: subtype, complainedRecipients: [{ emailAddress: "bad@example.com" }], feedbackId: id },
}) });
const topic = "arn:aws:sns:ap-southeast-2:123456789012:feedback";

test("SES permanent bounces and complaints suppress durably; retries are idempotent", async () => {
  const { processFeedbackMessage } = require("../src/utils/emailFeedback");
  await processFeedbackMessage(feedback("soft", "Bounce", "Transient"), topic);
  assert.equal(await Suppression.countDocuments(), 0);
  await processFeedbackMessage(feedback("hard", "Bounce"), topic);
  assert.equal((await Suppression.findOne()).reason, "BOUNCE");
  await processFeedbackMessage(feedback("spam", "Complaint", "abuse"), topic);
  assert.equal((await Suppression.findOne()).reason, "COMPLAINT");
  await processFeedbackMessage(feedback("hard2", "Bounce"), topic);
  assert.equal((await Suppression.findOne()).reason, "COMPLAINT");
  assert.equal((await processFeedbackMessage(feedback("spam", "Complaint"), topic)).duplicate, true);
  assert.equal(await Suppression.countDocuments(), 1);
  assert.equal(await Events.countDocuments(), 4);
  await assert.rejects(processFeedbackMessage(feedback("evil", "Bounce"), "other-topic"), /Unexpected feedback topic/);
  await assert.rejects(processFeedbackMessage("not-json", topic));
  const { sesClient } = require("../src/utils/sesClient");
  const send = mock.method(sesClient, "send");
  assert.equal((await sendEmail.run("Blocked", "Body", "bad@example.com")).skipped, true);
  assert.equal(send.mock.callCount(), 0);
});

test("SQS failures leave messages unacknowledged for retry", async () => {
  const { pollFeedback, sqsClient } = require("../src/utils/emailFeedback");
  const commands = [];
  mock.method(sqsClient, "send", async command => { commands.push(command.constructor.name); return { Messages: [{ MessageId: "invalid", ReceiptHandle: "handle", Body: "{}" }] }; });
  await pollFeedback();
  assert.deepEqual(commands, ["ReceiveMessageCommand"]);
});

test("SES setup confirmations and not-spam feedback never suppress recipients", async () => {
  const { processFeedbackMessage } = require("../src/utils/emailFeedback");
  const setup = JSON.stringify({ Type: "Notification", TopicArn: topic, MessageId: "setup", Message: JSON.stringify({ notificationType: "AmazonSnsSubscriptionSucceeded" }) });
  assert.equal((await processFeedbackMessage(setup, topic)).setup, true);
  await processFeedbackMessage(feedback("not-spam", "Complaint", "not-spam"), topic);
  assert.equal(await Suppression.countDocuments(), 0);
  const invalid = JSON.parse(feedback("bad-sender", "Bounce"));
  const message = JSON.parse(invalid.Message);
  message.mail.source = "unrelated@example.com";
  invalid.Message = JSON.stringify(message);
  await assert.rejects(processFeedbackMessage(JSON.stringify(invalid), topic), /Unexpected SES sender/);
});
