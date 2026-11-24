const User = require("../models/user");
const ConnectionRequest = require("../models/connectionRequest");
const { connectDB, disconnectDB } = require("../config/database");

const fixtureFilter = (runId) => {
  if (!/^[a-f0-9]{32}$/.test(runId || "")) {
    throw new Error("A 32-character hexadecimal test run ID is required");
  }

  return {
    emailId: {
      $regex: new RegExp(`^e2e\\.${runId}\\.(alpha|bravo|charlie|delta|extra[0-9]+)@example\\.com$`),
    },
  };
};

const manageFixtures = async ({ action, runId }) => {
  if (!["isolate", "cleanup"].includes(action)) {
    throw new Error("Fixture action must be isolate or cleanup");
  }

  const filter = fixtureFilter(runId);
  const users = await User.find(filter).select("_id");
  if (users.length > 16) {
    throw new Error("Refusing to operate on more than 16 test accounts");
  }
  const ids = users.map((user) => user._id);

  if (action === "cleanup") {
    const requests = await ConnectionRequest.deleteMany({
      $or: [{ fromUserId: { $in: ids } }, { toUserId: { $in: ids } }],
    });
    const accounts = await User.deleteMany({ ...filter, _id: { $in: ids } });
    return { deletedTestAccounts: accounts.deletedCount, deletedTestRequests: requests.deletedCount };
  }

  // Exclude real profiles from test feeds without editing any real user's document.
  const others = await User.find({ _id: { $nin: ids } }).select("_id");
  const operations = users.flatMap((user) => others.map((other) => ({
    updateOne: {
      filter: { fromUserId: user._id, toUserId: other._id },
      update: { $setOnInsert: { status: "ignored" } },
      upsert: true,
    },
  })));
  if (operations.length) {
    await ConnectionRequest.bulkWrite(operations);
  }
  return { isolatedTestAccounts: users.length, excludedProfiles: others.length };
};

if (require.main === module) {
  const [action, runId] = process.argv.slice(2);
  Promise.resolve()
    .then(() => {
      fixtureFilter(runId);
      return connectDB();
    })
    .then(() => manageFixtures({ action, runId }))
    .then((result) => console.log(JSON.stringify(result)))
    .catch((error) => {
      console.error(error.name + ": " + error.message);
      process.exitCode = 1;
    })
    .finally(disconnectDB);
}

module.exports = { fixtureFilter, manageFixtures };
