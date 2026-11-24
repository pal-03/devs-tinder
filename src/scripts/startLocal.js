const { MongoMemoryServer } = require("mongodb-memory-server");

let mongoServer;
let stopServer;

const cleanup = async () => {
  try {
    if (stopServer) {
      await stopServer();
    }
  } finally {
    if (mongoServer) {
      await mongoServer.stop();
    }
  }
};

const main = async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: { dbName: "devstinder" },
  });

  process.env.MONGODB_URI = mongoServer.getUri();
  process.env.DISABLE_EMAILS ??= "true";
  process.env.DISABLE_CRON ??= "true";
  process.env.SES_FEEDBACK_QUEUE_URL = "";
  process.env.SES_FEEDBACK_TOPIC_ARN = "";

  const { startServer, stopServer: stopAppServer } = require("../app");
  stopServer = stopAppServer;

  const server = await startServer();
  const address = server.address();

  console.log(`Using in-memory MongoDB at ${process.env.MONGODB_URI}`);
  console.log(`Server is listening on port ${address.port}`);
  console.log("Local database is temporary; its data is removed when this process stops.");
};

process.on("SIGINT", async () => {
  await cleanup();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await cleanup();
  process.exit(0);
});

main().catch(async (err) => {
  console.error(err.message);
  await cleanup();
  process.exit(1);
});
