const cron = require("node-cron");
const { subDays, startOfDay, endOfDay } = require("date-fns");
// subDays is used to calculate the date for "yesterday" by subtracting
//  one day from the current date.
// startOfDay and endOfDay are used to determine the start and end
// of a given day, respectively.
const { clientOrigin, cronExpression, disableCron } = require("../config/env");
const emailNotifications = require("./emailNotifications");
const ConnectionRequestModel = require("../models/connectionRequest");

let scheduledTask;

const getYesterdayWindow = (now = new Date()) => {
  // The code calculates the date for "yesterday" by subtracting one day from the current date using subDays(new Date(), 1).
  //  It then determines the start and end of yesterday using startOfDay(yesterday) and endOfDay(yesterday), respectively.
  //  This allows the code to query for connection requests that were created within the time range of yesterday.
  const yesterday = subDays(now, 1);

  return {
    yesterdayStart: startOfDay(yesterday),
    yesterdayEnd: endOfDay(yesterday),
  };
};

const sendPendingConnectionRequestEmails = async ({ now = new Date(), requestIds } = {}) => {
  // Send emails to all people who got requests the previous day
  const { yesterdayStart, yesterdayEnd } = getYesterdayWindow(now);

  // The code queries the ConnectionRequestModel to find all connection requests
  //  that have a status of "interested" and were created within the time range
  //  of yesterday (from the start of the day to the end of the day).
  const query = {
    status: "interested",
    createdAt: {
      $gte: yesterdayStart,
      $lte: yesterdayEnd,
    },
  };
  if (requestIds !== undefined) {
    if (!Array.isArray(requestIds)) {
      throw new Error("requestIds must be an array");
    }
    query._id = { $in: requestIds };
  }
  const pendingRequests = await ConnectionRequestModel.find(query).populate("fromUserId toUserId", "firstName lastName emailId emailConsent"); // The populate method is used to fetch the
  //  user names and email addresses for the fromUserId and toUserId fields
  // in the connection requests. This allows access to the email addresses
  // of the users involved in the connection requests.

  // The code then creates a list of unique email addresses of the users
  //  who received connection requests yesterday.
  const listOfEmails = [
    ...new Set(
      pendingRequests
        .filter((req) => req.toUserId?.emailConsent?.enabled && req.toUserId.emailConsent.confirmedAt && req.toUserId.emailConsent.emailId === req.toUserId.emailId)
        .map((req) => req.toUserId?.emailId)
        .filter((emailId) => Boolean(emailId))
    ),
  ];

  console.log("Pending request reminder recipients:", listOfEmails);

  const results = [];

  for (const email of listOfEmails) {
    // Send Emails
    // The code iterates through the list of unique email addresses and
    //  sends an email
    try {
      const recipient = pendingRequests.find(req => req.toUserId?.emailId === email).toUserId;
      const res = await emailNotifications.run(
        recipient._id,
        "New Friend Requests pending for " + email,
        "You have pending connection requests. Review them at " + new URL("/requests", clientOrigin).href
      );

      results.push({
        email,
        sent: !res.skipped,
        skipped: res.skipped,
        messageId: res.MessageId,
      });
      console.log("Pending request reminder sent:", {
        email,
        sent: !res.skipped,
        skipped: res.skipped,
        messageId: res.MessageId,
      });
    } catch (err) {
      results.push({
        email,
        sent: false,
        error: err.name || "EmailSendFailed",
      });
      console.error("Pending request reminder failed:", {
        email,
        error: err.name || "EmailSendFailed",
      });
    }
  }

  return {
    pendingRequestsCount: pendingRequests.length,
    recipientCount: listOfEmails.length,
    results,
  };
};

const startCronJob = ({ requestIds } = {}) => {
  if (disableCron) {
    console.log("Cron job disabled.");
    return null;
  }

  if (scheduledTask) {
    return scheduledTask;
  }

  if (!cron.validate(cronExpression)) {
    throw new Error("Invalid CRON_EXPRESSION: " + cronExpression);
  }

  // This job will run at 8 AM in the morning everyday by default.
  // The cron expression "0 8 * * *" means:
  // - Minute: 0 (at the start of the hour)
  // - Hour: 8 (8 AM)
  // - Day of Month: * (every day of the month)
  // - Month: * (every month)
  // - Day of Week: * (every day of the week)
  // For local testing, set CRON_EXPRESSION in .env to something like:
  // */10 * * * * *
  scheduledTask = cron.schedule(cronExpression, async () => {
    try {
      const summary = await sendPendingConnectionRequestEmails({ requestIds });
      console.log("Pending request reminder job completed:", summary);
      return summary;
    } catch (err) {
      console.error("Pending request reminder job failed:", err);
      throw err;
    }
  }, { name: "pending-connection-request-reminders", noOverlap: true });

  console.log("Cron job scheduled:", cronExpression);
  return scheduledTask;
};

const stopCronJob = () => {
  if (!scheduledTask) {
    return;
  }

  scheduledTask.stop();
  scheduledTask = null;
};

module.exports = {
  sendPendingConnectionRequestEmails,
  startCronJob,
  stopCronJob,
};
