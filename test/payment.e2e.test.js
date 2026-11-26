const assert = require("node:assert/strict");
const { before, after, afterEach, beforeEach, test, mock } = require("node:test");
const { randomUUID, createHmac } = require("node:crypto");
const request = require("supertest");
const { MongoMemoryReplSet } = require("mongodb-memory-server");
const keySecret = "fixture-checkout-secret";
const webhookSecret = "fixture-webhook-secret";
let mongo, server, Payment, Events, User, gateway, client;
let orders, remotePayments, createCalls;
const signature = (value, secret) => createHmac("sha256", secret).update(value).digest("hex");

before(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  Object.assign(process.env, { MONGODB_URI: mongo.getUri(), JWT_SECRET: "isolated-payment-tests", DISABLE_EMAILS: "true", DISABLE_CRON: "true", SES_FEEDBACK_QUEUE_URL: "", SES_FEEDBACK_TOPIC_ARN: "", RAZORPAY_KEY_ID: "rzp_test_fixture", RAZORPAY_KEY_SECRET: keySecret, RAZORPAY_WEBHOOK_SECRET: webhookSecret, RAZORPAY_MODE: "test", RAZORPAY_LIVE_ENABLED: "false" });
  Payment = require("../src/models/payment"); Events = require("../src/models/paymentWebhookEvent"); User = require("../src/models/user"); gateway = require("../src/utils/razorpay");
  server = await require("../src/app").startServer({ port: 0 });
});

beforeEach(() => {
  orders = new Map(); remotePayments = new Map(); createCalls = 0;
  client = {
    orders: {
      create: async input => { createCalls++; const order = { ...input, id: "order_" + randomUUID().replaceAll("-", ""), status: "created" }; orders.set(order.id, order); return order; },
      fetchPayments: async orderId => ({ items: [...remotePayments.values()].filter(p => p.order_id === orderId) }),
    },
    payments: { fetch: async id => { if (!remotePayments.has(id)) throw new Error("Unknown fixture payment"); return remotePayments.get(id); } },
  };
  mock.method(gateway, "getClient", () => client);
});
afterEach(async () => { mock.restoreAll(); await Promise.all([Payment.deleteMany({}), Events.deleteMany({}), User.deleteMany({})]); });
after(async () => { await require("../src/app").stopServer(); await require("../src/config/database").disconnectDB(); await mongo.stop(); });

const signup = async () => {
  const agent = request.agent(server);
  const response = await agent.post("/signup").send({ firstName: "PaymentTest", lastName: "Isolated", emailId: randomUUID() + "@example.com", password: "StrongP@ss1", isPremium: true, membershipType: "gold" }).expect(201);
  assert.equal(response.body.data.isPremium, false);
  return { agent, id: response.body.data._id };
};
const create = async (agent, type = "silver", key = randomUUID()) => {
  const response = await agent.post("/payment/create").set("Idempotency-Key", key).send({ membershipType: type }).expect(200);
  return response.body;
};
const remote = (order, status = "captured", overrides = {}) => {
  const payment = { id: "pay_" + randomUUID().replaceAll("-", ""), order_id: order.orderId, status, captured: status === "captured", amount: order.amount, currency: order.currency, amount_refunded: 0, ...overrides };
  remotePayments.set(payment.id, payment);
  return payment;
};
const verify = (agent, order, payment) => agent.post("/payment/verify").send({ razorpay_order_id: order.orderId, razorpay_payment_id: payment.id, razorpay_signature: signature(order.orderId + "|" + payment.id, keySecret) });
const webhook = (payment, type = "payment.captured", id = randomUUID(), raw) => {
  const body = raw || JSON.stringify({ event: type, payload: { payment: { entity: payment } } }, null, 2);
  return request(server).post("/payment/webhook").set("Content-Type", "application/json").set("X-Razorpay-Signature", signature(body, webhookSecret)).set("x-razorpay-event-id", id).send(body);
};

test("orders require auth, valid plans and server-controlled amounts; request retries are idempotent", async () => {
  await request(server).post("/payment/create").send({ membershipType: "silver" }).expect(401);
  const { agent } = await signup();
  for (const membershipType of ["platinum", "toString", "__proto__", {}, null]) await agent.post("/payment/create").set("Idempotency-Key", randomUUID()).send({ membershipType }).expect(400);
  await agent.post("/payment/create").send({ membershipType: "silver" }).expect(400);
  await agent.post("/payment/create").set("Idempotency-Key", randomUUID()).send({ membershipType: "gold", amount: 1 }).expect(400);
  assert.equal(createCalls, 0);
  const key = randomUUID();
  const silver = await create(agent, "silver", key);
  assert.equal(silver.amount, 30000); assert.equal(silver.currency, "INR"); assert.equal(silver.keyId, "rzp_test_fixture");
  assert.equal(silver.keySecret, undefined);
  assert.equal((await create(agent, "silver", key)).orderId, silver.orderId);
  assert.equal(createCalls, 1);
  await agent.post("/payment/create").set("Idempotency-Key", key).send({ membershipType: "gold" }).expect(409);
  assert.equal((await create(agent, "gold")).amount, 70000);
});

test("concurrent duplicate create requests contact the gateway only once", async () => {
  const { agent } = await signup(); const key = randomUUID();
  const results = await Promise.all(Array.from({ length: 4 }, () => agent.post("/payment/create").set("Idempotency-Key", key).send({ membershipType: "silver" })));
  assert.ok(results.every(r => [200, 409].includes(r.status)));
  assert.equal(createCalls, 1); assert.equal(await Payment.countDocuments(), 1);
});

test("cross-user order access, forged signatures and modified amounts are rejected", async () => {
  const alice = await signup(); const bob = await signup(); const order = await create(alice.agent); const payment = remote(order);
  await verify(bob.agent, order, payment).expect(404);
  await bob.agent.get("/payment/status/" + order.orderId).expect(404);
  await alice.agent.post("/payment/verify").send({ razorpay_order_id: order.orderId, razorpay_payment_id: payment.id, razorpay_signature: "0".repeat(64) }).expect(400);
  payment.amount = 1;
  await verify(alice.agent, order, payment).expect(400);
  assert.equal((await User.findById(alice.id)).isPremium, false);
  await alice.agent.patch("/profile/edit").send({ isPremium: true }).expect(400);
});

test("captured callback activates membership exactly once and persists through reload/login APIs", async () => {
  const { agent, id } = await signup(); const order = await create(agent); const payment = remote(order);
  const response = await verify(agent, order, payment).expect(200);
  assert.equal(response.body.membership.active, true); assert.equal(response.body.membership.type, "silver");
  const saved = await Payment.findOne({ orderId: order.orderId });
  await verify(agent, order, payment).expect(200);
  await webhook(payment, "payment.captured", "event-once").expect(200);
  assert.equal((await webhook(payment, "payment.captured", "event-once").expect(200)).body.duplicate, true);
  await webhook(payment, "order.paid", "event-order").expect(200);
  const again = await Payment.findById(saved._id);
  assert.equal(again.fulfilledAt.getTime(), saved.fulfilledAt.getTime());
  assert.equal(again.membershipExpiresAt.getTime(), saved.membershipExpiresAt.getTime());
  assert.equal(await Events.countDocuments(), 2);
  assert.equal((await agent.get("/profile/view").expect(200)).body.isPremium, true);
  assert.equal((await User.findById(id)).membershipMode, "test");
  await agent.post("/payment/create").set("Idempotency-Key", randomUUID()).send({ membershipType: "gold" }).expect(409);
});

test("raw webhook bytes are required and invalid/missing signatures never mutate membership", async () => {
  const { agent, id } = await signup(); const order = await create(agent); const payment = remote(order);
  const body = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: payment } } }, null, 2);
  await request(server).post("/payment/webhook").send(JSON.parse(body)).expect(400);
  await request(server).post("/payment/webhook").set("Content-Type", "application/json").set("X-Razorpay-Signature", signature(JSON.stringify(JSON.parse(body)), webhookSecret)).set("x-razorpay-event-id", "tampered").send(body).expect(400);
  assert.equal((await User.findById(id)).isPremium, false); assert.equal(await Events.countDocuments(), 0);
  await webhook(payment, "payment.captured", "valid-pretty", body).expect(200);
  assert.equal((await User.findById(id)).isPremium, true);
});

test("authorized/failed events do not grant membership; status reconciliation recovers a missed capture callback", async () => {
  const { agent, id } = await signup(); const order = await create(agent); const payment = remote(order, "authorized");
  assert.equal((await verify(agent, order, payment).expect(202)).body.membership.active, false);
  await webhook(payment, "payment.authorized").expect(200);
  assert.equal((await User.findById(id)).isPremium, false);
  payment.status = "failed";
  await webhook(payment, "payment.failed").expect(200);
  assert.equal((await User.findById(id)).isPremium, false);
  payment.status = "captured"; payment.captured = true;
  const result = await agent.get("/payment/status/" + order.orderId).expect(200);
  assert.equal(result.body.membership.active, true);
  payment.status = "authorized"; payment.captured = false;
  await webhook(payment, "payment.authorized").expect(200);
  assert.equal((await Payment.findOne({ orderId: order.orderId })).status, "captured");
});

test("concurrent webhook deliveries fulfil once and persist a single audit event", async () => {
  const { agent } = await signup(); const order = await create(agent); const payment = remote(order);
  const responses = await Promise.all(Array.from({ length: 4 }, () => webhook(payment, "payment.captured", "same-event")));
  assert.ok(responses.every(r => r.status === 200), responses.map(r => r.status).join(","));
  assert.equal(await Events.countDocuments(), 1);
  assert.ok((await Payment.findOne({ orderId: order.orderId })).fulfilledAt);
});

test("database failure rolls back fulfilment and leaves the webhook retryable", async () => {
  const { agent, id } = await signup(); const order = await create(agent); const payment = remote(order);
  const failing = mock.method(User, "updateOne", async () => { throw new Error("Fixture database failure"); });
  await webhook(payment, "payment.captured", "retry-event").expect(502);
  failing.mock.restore();
  assert.equal((await User.findById(id)).isPremium, false);
  assert.equal((await Payment.findOne({ orderId: order.orderId })).fulfilledAt, undefined);
  assert.equal(await Events.countDocuments(), 0);
  await webhook(payment, "payment.captured", "retry-event").expect(200);
  assert.equal((await User.findById(id)).isPremium, true);
});

test("partial refunds preserve access; full refunds revoke it and stale captures cannot restore it", async () => {
  const { agent, id } = await signup(); const order = await create(agent, "gold"); const payment = remote(order);
  await verify(agent, order, payment).expect(200);
  payment.amount_refunded = 100;
  await webhook(payment, "refund.processed").expect(200);
  assert.equal((await Payment.findOne()).status, "partially_refunded");
  assert.equal((await User.findById(id)).isPremium, true);
  payment.amount_refunded = payment.amount; payment.status = "refunded";
  await webhook(payment, "refund.processed").expect(200);
  assert.equal((await User.findById(id)).isPremium, false);
  payment.amount_refunded = 0; payment.status = "captured";
  await webhook(payment, "payment.captured").expect(200);
  assert.equal((await User.findById(id)).isPremium, false);
});

test("expired and test-mode memberships cannot grant live access", async () => {
  const { agent, id } = await signup();
  await User.updateOne({ _id: id }, { $set: { isPremium: true, membershipType: "gold", membershipMode: "live", membershipExpiresAt: new Date(Date.now() + 86400000) } });
  assert.equal((await agent.get("/profile/view").expect(200)).body.isPremium, false);
  await User.updateOne({ _id: id }, { $set: { membershipMode: "test", membershipExpiresAt: new Date(0) } });
  assert.equal((await agent.get("/payment/membership").expect(200)).body.membership.active, false);
});

test("unknown orders and unrelated signed events are acknowledged without granting access", async () => {
  const { id } = await signup();
  await webhook({ id: "pay_unknown", order_id: "order_unknown" }, "payment.captured", "unknown-order").expect(200);
  await webhook({}, "unrelated.event", "unrelated").expect(200);
  assert.equal((await User.findById(id)).isPremium, false);
  assert.equal((await Events.findOne()).result, "unknown_order");
});

test("unconfigured gateway fails closed without contacting Razorpay", async () => {
  const { agent } = await signup();
  mock.method(gateway, "isConfigured", () => false);
  await agent.post("/payment/create").set("Idempotency-Key", randomUUID()).send({ membershipType: "silver" }).expect(503);
  assert.equal(createCalls, 0);
});

test("test-mode payment attempts do not overwrite a paid live membership snapshot", async () => {
  const { agent, id } = await signup();
  const expiresAt = new Date(Date.now() + 86400000);
  await User.updateOne({ _id: id }, { $set: { "memberships.live": { active: true, type: "gold", expiresAt } } });
  const order = await create(agent); const payment = remote(order, "authorized");
  await verify(agent, order, payment).expect(202);
  const saved = await User.findById(id);
  assert.equal(saved.memberships.get("live").active, true);
  assert.equal(saved.memberships.get("live").expiresAt.getTime(), expiresAt.getTime());
  assert.equal((await agent.get("/profile/view").expect(200)).body.isPremium, false);
});

test("deployment and live fixture helpers refuse live keys and unsafe scopes", async () => {
  const { configure } = require("../src/scripts/configurePaymentEnv");
  assert.throws(() => configure({ RAZORPAY_KEY_ID: "rzp_live_fixture", RAZORPAY_MODE: "live" }), /Only a complete TEST-mode/);
  const { run } = require("../src/scripts/paymentTestFixtures");
  await assert.rejects(run("cleanup", ""), /exact run ID/);
  mock.method(gateway, "getMode", () => "live");
  await assert.rejects(run("create", "a".repeat(32)), /only use a configured Razorpay TEST/);
});
