const assert = require("node:assert/strict");
const { afterEach, mock, test } = require("node:test");

process.env.DISABLE_EMAILS = "false";
const { sesClient } = require("../src/utils/sesClient");
const sendEmail = require("../src/utils/sendEmail");
const EmailSuppression = require("../src/models/emailSuppression");
const { beforeEach } = require("node:test");
beforeEach(() => mock.method(EmailSuppression, "exists", async () => null));

afterEach(() => mock.restoreAll());

test("email options send to the requested recipient without contacting AWS", async () => {
  let sentCommand;
  mock.method(sesClient, "send", async (command) => {
    sentCommand = command;
    return { MessageId: "stub-id" };
  });
  await sendEmail.run("Test", "Hello <recipient>", { toAddress: "recipient@example.com", fromAddress: "sender@example.com" });
  assert.deepEqual(sentCommand.input.Destination.ToAddresses, ["recipient@example.com"]);
  assert.equal(sentCommand.input.Source, "sender@example.com");
  assert.equal(sentCommand.input.Message.Body.Html.Data, "<h1>Hello &lt;recipient&gt;</h1>");
});

test("positional recipient remains supported with sender options", async () => {
  let sentCommand;
  mock.method(sesClient, "send", async (command) => {
    sentCommand = command;
    return { MessageId: "stub-id" };
  });
  await sendEmail.run("Test", "Body", "recipient@example.com", { fromAddress: "sender@example.com" });
  assert.deepEqual(sentCommand.input.Destination.ToAddresses, ["recipient@example.com"]);
  assert.equal(sentCommand.input.Source, "sender@example.com");
});

test("suppressed addresses never reach SES, including confirmation emails", async () => {
  EmailSuppression.exists = async () => ({ _id: "blocked" });
  const send = mock.method(sesClient, "send");
  const result = await sendEmail.run("Test", "Body", "recipient@example.com");
  assert.equal(result.skipped, true);
  assert.equal(send.mock.callCount(), 0);
});
