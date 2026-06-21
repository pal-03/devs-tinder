require("dotenv").config({ quiet: true });

module.exports = {
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  jwtSecret: process.env.JWT_SECRET || "DEV@Tinder$790",
  mongodbUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/devstinder",
  port: Number(process.env.PORT) || 7777,
  awsRegion: process.env.AWS_REGION || "ap-southeast-2",
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY,
  awsSecretAccessKey:
    process.env.AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_KEY,
  disableEmails: process.env.DISABLE_EMAILS === "true",
  sesFromAddress: process.env.SES_FROM_ADDRESS || "swayam@devs-tinder.in",
  sesToAddress: process.env.SES_TO_ADDRESS || "swayampal82@gmail.com",
};
