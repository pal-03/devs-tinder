const { SendEmailCommand } = require("@aws-sdk/client-ses");
const {
  disableEmails,
  sesFromAddress,
  sesToAddress,
} = require("../config/env");
const { sesClient } = require("./sesClient.js");

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// snippet-start:[ses.JavaScript.email.sendEmailV3]
// Create the parameters for the email message.
// The createSendEmailCommand function constructs a SendEmailCommand object
//  with the necessary parameters for sending an email using AWS SES. 
// It takes the recipient's email address (toAddress), sender's email address (fromAddress),
//  email subject (subject), and email body (body) as input parameters. 
// The function returns a SendEmailCommand object that can be used to send the email. 
// The email message includes the destination (recipient's email address),
//  message content (subject and body), source (sender's email address),
//  and reply-to addresses (if any). The body of the email is formatted in both HTML and text formats.    
const createSendEmailCommand = (toAddress, fromAddress, subject, body) => {
  return new SendEmailCommand({
    // The Destination parameter specifies the recipient's email address (toAddress) 
    // and any CC addresses (CcAddresses).
    Destination: {
      CcAddresses: [],
      ToAddresses: [toAddress],
    },
    // The Message parameter contains the email content, including the subject and body.
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: `<h1>${escapeHtml(body)}</h1>`,
        },
        Text: {
          Charset: "UTF-8",
          Data: body,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: subject,
      },
    },
    Source: fromAddress,
    ReplyToAddresses: [
      /* more items */
    ],
  });
};

// actual code to send email using the sesClient and the createSendEmailCommand function.

const run = async (subject, body, options = {}) => {
  if (disableEmails) {
    return { skipped: true, reason: "Email sending is disabled" };
  }

  const sendEmailCommand = createSendEmailCommand(
    options.toAddress || sesToAddress,
    options.fromAddress || sesFromAddress,
    subject,
    body
  );

  try {
    return await sesClient.send(sendEmailCommand);
  } catch (caught) {
    throw caught;
  }
};

// snippet-end:[ses.JavaScript.email.sendEmailV3]
module.exports = { run };
