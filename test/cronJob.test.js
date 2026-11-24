const assert = require("node:assert/strict");
const { afterEach, mock, test } = require("node:test");

process.env.DISABLE_CRON = "false";
process.env.CRON_EXPRESSION = "0 8 * * *";
const cron = require("node-cron");
const ConnectionRequest = require("../src/models/connectionRequest");
const { startCronJob, stopCronJob, sendPendingConnectionRequestEmails } = require("../src/utils/cronJob");

afterEach(() => {
  stopCronJob();
  mock.restoreAll();
});

test("scheduled reminders retain their result and cannot overlap", async () => {
  let captured;
  mock.method(cron, "schedule", (expression, callback, options) => {
    captured = { expression, callback, options };
    return { stop() {} };
  });
  mock.method(ConnectionRequest, "find", (query) => {
    assert.deepEqual(query._id, { $in: [] });
    return { populate: async () => [] };
  });
  startCronJob({ requestIds: [] });
  assert.equal(captured.expression, "0 8 * * *");
  assert.equal(captured.options.noOverlap, true);
  assert.equal((await captured.callback()).recipientCount, 0);
});

test("scheduler exposes database failures instead of reporting a successful run", async () => {
  let callback;
  mock.method(cron, "schedule", (expression, fn) => {
    callback = fn;
    return { stop() {} };
  });
  mock.method(ConnectionRequest, "find", () => { throw new Error("Database unavailable"); });
  startCronJob();
  await assert.rejects(callback(), /Database unavailable/);
});

test("invalid reminder scope is rejected before accessing database records", async () => {
  const find = mock.method(ConnectionRequest, "find");
  await assert.rejects(sendPendingConnectionRequestEmails({ requestIds: "all" }), /requestIds must be an array/);
  assert.equal(find.mock.callCount(), 0);
});

test("live email verification cannot send without its explicit command flag", () => {
  const { spawnSync } = require("node:child_process");
  const result = spawnSync(process.execPath, [require.resolve("../src/scripts/verifyEmailDelivery")], { encoding: "utf8", timeout: 5000 });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Explicit --send-to-configured-inbox approval is required/);
});
