const assert = require("node:assert/strict");
const { after, afterEach, before, mock, test } = require("node:test");

const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongoServer;
let server;
let startServer;
let stopServer;
let disconnectDB;
let User;
let ConnectionRequest;

const createUserPayload = ({
  firstName,
  lastName,
  emailId,
  gender,
  age,
  skills = [],
}) => ({
  firstName,
  lastName,
  emailId,
  password: "StrongP@ss1",
  age,
  gender,
  skills,
});

const confirmTestConsent = async (id) => {
  const user = await User.findById(id);
  require("../src/utils/emailConsent").setEmailConsent(user, true, "test");
  user.emailConsent.confirmedAt = new Date();
  await user.save();
};

before(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: { dbName: "devstinder-test" },
  });

  process.env.MONGODB_URI = mongoServer.getUri();
  process.env.JWT_SECRET = "test-secret";
  process.env.CLIENT_ORIGIN = "http://localhost:5173";
  process.env.PORT = "0";
  process.env.DISABLE_EMAILS = "true";
  process.env.DISABLE_CRON = "true";
  process.env.SES_FEEDBACK_QUEUE_URL = "";
  process.env.SES_FEEDBACK_TOPIC_ARN = "";

  ({ startServer, stopServer } = require("../src/app"));
  ({ disconnectDB } = require("../src/config/database"));
  User = require("../src/models/user");
  ConnectionRequest = require("../src/models/connectionRequest");

  server = await startServer({ port: 0 });
});

afterEach(async () => {
  await ConnectionRequest.deleteMany({});
  await User.deleteMany({});
  await require("../src/models/emailSuppression").deleteMany({});
  await require("../src/models/emailFeedbackEvent").deleteMany({});
});

after(async () => {
  await stopServer();
  await disconnectDB();
  await mongoServer.stop();
});

test("GET /health returns an ok status", async () => {
  const response = await request(server).get("/health").expect(200);

  assert.deepEqual(response.body, { status: "ok" });
});

test("GET /health reports an unavailable database instead of a false success", async () => {
  const command = mock.method(User.db.db, "command", async () => {
    throw new Error("Simulated database outage");
  });
  try {
    const response = await request(server).get("/health").expect(503);
    assert.deepEqual(response.body, { status: "error", database: "unavailable" });
  } finally {
    command.mock.restore();
  }
});

test("auth and connection flow works end to end", async () => {
  const aliceAgent = request.agent(server);
  const bobAgent = request.agent(server);

  const alicePayload = createUserPayload({
    firstName: "Alice",
    lastName: "Stone",
    emailId: "alice@example.com",
    gender: "female",
    age: 25,
    skills: ["node", "react"],
  });

  const bobPayload = createUserPayload({
    firstName: "Bobby",
    lastName: "Smith",
    emailId: "bob@example.com",
    gender: "male",
    age: 27,
    skills: ["go", "docker"],
  });

  const carolPayload = createUserPayload({
    firstName: "Carol",
    lastName: "Jones",
    emailId: "carol@example.com",
    gender: "female",
    age: 24,
    skills: ["python"],
  });

  await request(server).get("/profile/view").expect(401);

  const aliceSignup = await aliceAgent
    .post("/signup")
    .send(alicePayload)
    .expect(201);

  assert.equal(aliceSignup.body.data.emailId, alicePayload.emailId);
  assert.equal(aliceSignup.body.data.password, undefined);
  assert.ok(aliceSignup.headers["set-cookie"]);

  const aliceId = aliceSignup.body.data._id;

  const aliceProfile = await aliceAgent.get("/profile/view").expect(200);
  assert.equal(aliceProfile.body._id, aliceId);
  assert.equal(aliceProfile.body.password, undefined);

  const aliceEdit = await aliceAgent
    .patch("/profile/edit")
    .send({
      about: "Backend engineer",
      skills: ["node", "express", "mongodb"],
    })
    .expect(200);

  assert.equal(aliceEdit.body.data.about, "Backend engineer");
  assert.deepEqual(aliceEdit.body.data.skills, ["node", "express", "mongodb"]);

  const bobSignup = await bobAgent.post("/signup").send(bobPayload).expect(201);
  const bobId = bobSignup.body.data._id;

  await request(server).post("/signup").send(carolPayload).expect(201);

  const sendRequest = await aliceAgent
    .post(`/request/send/interested/${bobId}`)
    .expect(200);

  assert.equal(sendRequest.body.data.status, "interested");

  await aliceAgent.post(`/request/send/interested/${bobId}`).expect(400);

  const bobReceived = await bobAgent.get("/user/requests/received").expect(200);
  assert.equal(bobReceived.body.data.length, 1);
  assert.equal(bobReceived.body.data[0].fromUserId.firstName, "Alice");

  const requestId = bobReceived.body.data[0]._id;

  const reviewResponse = await bobAgent
    .post(`/request/review/accepted/${requestId}`)
    .expect(200);

  assert.equal(reviewResponse.body.data.status, "accepted");

  const aliceConnections = await aliceAgent
    .get("/user/connections")
    .expect(200);

  assert.equal(aliceConnections.body.data.length, 1);
  assert.equal(aliceConnections.body.data[0].firstName, "Bobby");

  const aliceFeed = await aliceAgent.get("/feed?page=1&limit=10").expect(200);
  assert.equal(aliceFeed.body.data.length, 1);
  assert.equal(aliceFeed.body.data[0].firstName, "Carol");

  await aliceAgent.post("/logout").expect(200);
  await aliceAgent.get("/profile/view").expect(401);

  const loginResponse = await aliceAgent
    .post("/login")
    .send({
      emailId: alicePayload.emailId,
      password: alicePayload.password,
    })
    .expect(200);

  assert.equal(loginResponse.body.data.emailId, alicePayload.emailId);
  assert.equal(loginResponse.body.data.password, undefined);

  await aliceAgent.get("/profile/view").expect(200);
});

test("user lookup, update and delete endpoints work", async () => {
  const userAgent = request.agent(server);
  const userPayload = createUserPayload({
    firstName: "Diana",
    lastName: "Brown",
    emailId: "diana@example.com",
    gender: "female",
    age: 26,
    skills: ["java"],
  });

  const signupResponse = await userAgent
    .post("/signup")
    .send(userPayload)
    .expect(201);

  const userId = signupResponse.body.data._id;

  await request(server).get(`/user?emailId=${userPayload.emailId}`).expect(401);
  await request(server).patch(`/user/${userId}`).send({ about: "blocked" }).expect(401);
  await request(server).delete("/user").send({ userId }).expect(401);

  const otherId = "000000000000000000000001";
  await userAgent.get("/user?emailId=other@example.com").expect(403);
  await userAgent.patch(`/user/${otherId}`).send({ about: "blocked" }).expect(403);
  await userAgent.delete("/user").send({ userId: otherId }).expect(403);

  const lookupResponse = await userAgent
    .get(`/user?emailId=${encodeURIComponent(userPayload.emailId)}`)
    .expect(200);

  assert.equal(lookupResponse.body.emailId, userPayload.emailId);
  assert.equal(lookupResponse.body.password, undefined);

  await userAgent
    .patch(`/user/${userId}`)
    .send({ about: "Updated bio", skills: ["java", "spring"] })
    .expect(200);

  const updatedUser = await userAgent
    .get(`/user?emailId=${encodeURIComponent(userPayload.emailId)}`)
    .expect(200);

  assert.equal(updatedUser.body.about, "Updated bio");
  assert.deepEqual(updatedUser.body.skills, ["java", "spring"]);

  await userAgent.delete("/user").send({ userId }).expect(200);
  await userAgent
    .get(`/user?emailId=${encodeURIComponent(userPayload.emailId)}`)
    .expect(401);
});

test("request notifications target recipients, skip ignores, and tolerate email failure", async () => {
  const sendEmail = require("../src/utils/sendEmail");
  const originalRun = sendEmail.run;
  const calls = [];
  sendEmail.run = async (...args) => {
    calls.push(args);
    return { MessageId: "stub-email-id" };
  };

  try {
    const sender = request.agent(server);
    await sender.post("/signup").send(createUserPayload({ firstName: "Sender", lastName: "Test", emailId: "sender@example.com" })).expect(201);
    const recipientIds = [];
    for (const name of ["First", "Second", "Third"]) {
      const response = await request(server).post("/signup").send(createUserPayload({ firstName: name, lastName: "Test", emailId: name.toLowerCase() + "@example.com" })).expect(201);
      recipientIds.push(response.body.data._id);
    }
    for (const id of recipientIds) await confirmTestConsent(id);

    await sender.post(`/request/send/ignored/${recipientIds[0]}`).expect(200);
    assert.equal(calls.length, 0);
    const interested = await sender.post(`/request/send/interested/${recipientIds[1]}`).expect(200);
    assert.equal(interested.body.email.sent, true);
    assert.equal(calls[0][2].toAddress, "second@example.com");

    sendEmail.run = async () => { throw new Error("Simulated SES failure"); };
    const failedEmail = await sender.post(`/request/send/interested/${recipientIds[2]}`).expect(200);
    assert.equal(failedEmail.body.email.sent, false);
    assert.equal(failedEmail.body.data.status, "interested");
  } finally {
    sendEmail.run = originalRun;
  }
});

test("daily reminders include the last millisecond of yesterday and deduplicate recipients", async () => {
  const sendEmail = require("../src/utils/sendEmail");
  const { sendPendingConnectionRequestEmails } = require("../src/utils/cronJob");
  const originalRun = sendEmail.run;
  const calls = [];
  sendEmail.run = async (...args) => {
    calls.push(args);
    return { MessageId: "stub-digest-id" };
  };

  try {
    const ids = [];
    for (const name of ["Alice", "Bobby", "Carol"]) {
      const response = await request(server).post("/signup").send(createUserPayload({ firstName: name, lastName: "Test", emailId: name.toLowerCase() + "@example.com" })).expect(201);
      ids.push(response.body.data._id);
    }
    for (const id of ids) await confirmTestConsent(id);
    const now = new Date(2026, 10, 25, 12);
    const rows = [
      { fromUserId: ids[0], toUserId: ids[2], status: "interested", createdAt: new Date(2026, 10, 24, 0) },
      { fromUserId: ids[1], toUserId: ids[2], status: "interested", createdAt: new Date(2026, 10, 24, 23, 59, 59, 999) },
      { fromUserId: ids[2], toUserId: ids[0], status: "interested", createdAt: new Date(2026, 10, 25, 0) },
      { fromUserId: ids[0], toUserId: ids[1], status: "rejected", createdAt: new Date(2026, 10, 24, 12) },
    ];
    const mongoose = require("mongoose");
    const inserted = await ConnectionRequest.collection.insertMany(rows.map(row => ({ ...row, fromUserId: new mongoose.Types.ObjectId(row.fromUserId), toUserId: new mongoose.Types.ObjectId(row.toUserId) })));
    const summary = await sendPendingConnectionRequestEmails({ now });
    assert.equal(summary.pendingRequestsCount, 2);
    assert.equal(summary.recipientCount, 1);
    assert.equal(calls.length, 1);
    assert.equal(calls[0][2].toAddress, "carol@example.com");
    assert.ok(calls[0][1].includes("http://localhost:5173/requests"));
    const scoped = await sendPendingConnectionRequestEmails({ now, requestIds: [inserted.insertedIds[0]] });
    assert.equal(scoped.pendingRequestsCount, 1);
    const empty = await sendPendingConnectionRequestEmails({ now, requestIds: [] });
    assert.equal(empty.recipientCount, 0);
  } finally {
    sendEmail.run = originalRun;
  }
});
