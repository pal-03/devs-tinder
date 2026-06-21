const { SESClient } = require("@aws-sdk/client-ses");
const { awsAccessKeyId, awsRegion, awsSecretAccessKey } = require("../config/env");

// Set the AWS Region.
const REGION = awsRegion;
// Create SES service object.
const sesClient = new SESClient({
  region: REGION,
  credentials:
    awsAccessKeyId && awsSecretAccessKey
      ? {
          accessKeyId: awsAccessKeyId,
          secretAccessKey: awsSecretAccessKey,
        }
      : undefined,
});

module.exports = { sesClient };
// snippet-end:[ses.JavaScript.createclientv3]
