const assert = require("node:assert/strict");
const { after, afterEach, before, test } = require("node:test");

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

before(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: { dbName: "devstinder-test" },
  });

  process.env.MONGODB_URI = mongoServer.getUri();
  process.env.JWT_SECRET = "test-secret";
  process.env.CLIENT_ORIGIN = "http://localhost:5173";
  process.env.PORT = "0";

  ({ startServer, stopServer } = require("../src/app"));
  ({ disconnectDB } = require("../src/config/database"));
  User = require("../src/models/user");
  ConnectionRequest = require("../src/models/connectionRequest");

  server = await startServer({ port: 0 });
});

afterEach(async () => {
  await ConnectionRequest.deleteMany({});
  await User.deleteMany({});
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
  const userPayload = createUserPayload({
    firstName: "Diana",
    lastName: "Brown",
    emailId: "diana@example.com",
    gender: "female",
    age: 26,
    skills: ["java"],
  });

  const signupResponse = await request(server)
    .post("/signup")
    .send(userPayload)
    .expect(201);

  const userId = signupResponse.body.data._id;

  const lookupResponse = await request(server)
    .get(`/user?emailId=${encodeURIComponent(userPayload.emailId)}`)
    .expect(200);

  assert.equal(lookupResponse.body.emailId, userPayload.emailId);
  assert.equal(lookupResponse.body.password, undefined);

  await request(server)
    .patch(`/user/${userId}`)
    .send({ about: "Updated bio", skills: ["java", "spring"] })
    .expect(200);

  const updatedUser = await request(server)
    .get(`/user?emailId=${encodeURIComponent(userPayload.emailId)}`)
    .expect(200);

  assert.equal(updatedUser.body.about, "Updated bio");
  assert.deepEqual(updatedUser.body.skills, ["java", "spring"]);

  await request(server).delete("/user").send({ userId }).expect(200);
  await request(server)
    .get(`/user?emailId=${encodeURIComponent(userPayload.emailId)}`)
    .expect(404);
});
