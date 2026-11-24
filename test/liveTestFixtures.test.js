const assert = require("node:assert/strict");
const { test } = require("node:test");
const { fixtureFilter, manageFixtures } = require("../src/scripts/liveTestFixtures");

test("live test fixtures require an exact, non-empty run identifier", () => {
  for (const invalid of ["", undefined, ".*", "abc", "a".repeat(33)]) {
    assert.throws(() => fixtureFilter(invalid), /test run ID/);
  }
});

test("live test cleanup cannot match ordinary accounts or another run", () => {
  const runId = "a".repeat(32);
  const expression = fixtureFilter(runId).emailId.$regex;
  assert.ok(expression.test(`e2e.${runId}.alpha@example.com`));
  assert.ok(expression.test(`e2e.${runId}.extra11@example.com`));
  for (const email of ["alice@example.com", `e2e.${"b".repeat(32)}.alpha@example.com`, `e2e.${runId}.alpha@example.com.attacker`, `e2e.${runId}.owner@example.com`]) {
    assert.equal(expression.test(email), false);
  }
});

test("live fixture helper refuses unsupported actions before accessing data", async () => {
  await assert.rejects(manageFixtures({ action: "delete-all", runId: "a".repeat(32) }), /Fixture action/);
});
