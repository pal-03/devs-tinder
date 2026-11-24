const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require("@aws-sdk/client-sqs");
const validator = require("validator");
const EmailSuppression = require("../models/emailSuppression");
const EmailFeedbackEvent = require("../models/emailFeedbackEvent");
const { awsRegion, sesFromAddress, sesFeedbackQueueUrl, sesFeedbackTopicArn } = require("../config/env");
const { sesClient } = require("./sesClient");

const sqsClient = new SQSClient({ region: awsRegion, credentials: sesClient.config.credentials });
let worker;
const status = { running: false, lastPollAt: null, lastProcessedAt: null, lastError: null };

const processFeedbackMessage = async (body, expectedTopic = sesFeedbackTopicArn) => {
  const envelope = JSON.parse(body);
  // Only read the IAM-protected queue; SNS raw delivery is deliberately disabled.
  if (!expectedTopic || envelope.TopicArn !== expectedTopic || envelope.Type !== "Notification" || !envelope.MessageId) {
    throw new Error("Unexpected feedback topic or envelope");
  }
  const event = JSON.parse(envelope.Message);
  if (event.notificationType === "AmazonSnsSubscriptionSucceeded") return { setup: true };
  if (!event.mail?.messageId || event.mail.source?.toLowerCase() !== sesFromAddress.toLowerCase()) {
    throw new Error("Unexpected SES sender or missing message ID");
  }
  if (await EmailFeedbackEvent.exists({ snsMessageId: envelope.MessageId })) return { duplicate: true };
  const type = event.notificationType;
  let recipients = [];
  let suppressed = false;
  if (type === "Bounce") {
    recipients = event.bounce?.bouncedRecipients;
    suppressed = event.bounce?.bounceType === "Permanent";
  } else if (type === "Complaint") {
    recipients = event.complaint?.complainedRecipients;
    suppressed = event.complaint?.complaintFeedbackType !== "not-spam";
  } else {
    throw new Error("Unexpected SES feedback type");
  }
  if (!Array.isArray(recipients) || !recipients.length || recipients.some(r => typeof r.emailAddress !== "string" || !validator.isEmail(r.emailAddress))) {
    throw new Error("Invalid feedback recipients");
  }
  const emails = [...new Set(recipients.map(r => r.emailAddress.trim().toLowerCase()))];
  if (suppressed) {
    const reason = type === "Complaint" ? "COMPLAINT" : "BOUNCE";
    for (const emailId of emails) {
      const fields = { emailId, reason, messageId: event.mail.messageId, feedbackId: event.bounce?.feedbackId || event.complaint?.feedbackId };
      // A later bounce must never downgrade a complaint. Replayed events cannot undo a block.
      await EmailSuppression.updateOne({ emailId }, reason === "COMPLAINT" ? { $set: fields } : { $setOnInsert: fields }, { upsert: true });
    }
  }
  await EmailFeedbackEvent.updateOne({ snsMessageId: envelope.MessageId }, { $setOnInsert: { snsMessageId: envelope.MessageId, messageId: event.mail.messageId, type, recipients: emails, suppressed } }, { upsert: true });
  return { type, recipientCount: emails.length, suppressed };
};

const pollFeedback = async ({ signal } = {}) => {
  const response = await sqsClient.send(new ReceiveMessageCommand({ QueueUrl: sesFeedbackQueueUrl, MaxNumberOfMessages: 10, WaitTimeSeconds: 20, VisibilityTimeout: 60 }), { abortSignal: signal });
  status.lastPollAt = new Date().toISOString();
  for (const message of response.Messages || []) {
    try {
      const result = await processFeedbackMessage(message.Body);
      // Acknowledge only after durable suppression and audit writes have succeeded.
      await sqsClient.send(new DeleteMessageCommand({ QueueUrl: sesFeedbackQueueUrl, ReceiptHandle: message.ReceiptHandle }), { abortSignal: signal });
      status.lastProcessedAt = new Date().toISOString();
      console.log("SES feedback processed:", { snsMessageId: message.MessageId, ...result });
    } catch (error) {
      status.lastError = { at: new Date().toISOString(), name: error.name };
      console.error("SES feedback message retained for retry:", { messageId: message.MessageId, error: error.name });
    }
  }
};

const startEmailFeedback = () => {
  if (worker || !sesFeedbackQueueUrl || !sesFeedbackTopicArn) return;
  const controller = new AbortController();
  status.running = true;
  const done = (async () => {
    while (!controller.signal.aborted) {
      try {
        await pollFeedback({ signal: controller.signal });
      } catch (error) {
        if (controller.signal.aborted) break;
        status.lastError = { at: new Date().toISOString(), name: error.name };
        console.error("SES feedback poll failed:", error.name);
        await new Promise(resolve => {
          const finish = () => { clearTimeout(timer); controller.signal.removeEventListener("abort", finish); resolve(); };
          const timer = setTimeout(finish, 5000);
          controller.signal.addEventListener("abort", finish, { once: true });
        });
      }
    }
    status.running = false;
  })();
  worker = { controller, done };
};

const stopEmailFeedback = async () => {
  if (!worker) return;
  worker.controller.abort();
  await worker.done;
  worker = undefined;
};

module.exports = { processFeedbackMessage, pollFeedback, startEmailFeedback, stopEmailFeedback, status, sqsClient };
