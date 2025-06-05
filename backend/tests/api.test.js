process.env.STRIPE_SECRET_KEY = "test";
process.env.STRIPE_WEBHOOK_SECRET = "whsec";
process.env.DB_URL = "postgres://user:pass@localhost/db";
process.env.HUNYUAN_API_KEY = "test";
process.env.HUNYUAN_SERVER_URL = "http://localhost:4000";

jest.mock("../db", () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
}));
const db = require("../db");

jest.mock("axios");
const axios = require("axios");
const jwt = require("jsonwebtoken");

jest.mock("stripe");
const Stripe = require("stripe");
const stripeMock = {
  checkout: {
    sessions: {
      create: jest
        .fn()
        .mockResolvedValue({ id: "cs_test", url: "https://stripe.test" }),
    },
  },
  webhooks: {
    constructEvent: jest.fn(() => ({
      type: "checkout.session.completed",
      data: { object: { id: "cs_test", metadata: { jobId: "job1" } } },
    })),
  },
};
Stripe.mockImplementation(() => stripeMock);

jest.mock("../queue/printQueue", () => ({
  enqueuePrint: jest.fn(),
  processQueue: jest.fn(),
}));
const { enqueuePrint } = require("../queue/printQueue");

const request = require("supertest");
const app = require("../server");
const fs = require("fs");
const stream = require("stream");

beforeEach(() => {
  db.query.mockClear();
  axios.post.mockClear();
  enqueuePrint.mockClear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

test("POST /api/generate returns glb url", async () => {
  axios.post.mockResolvedValue({ data: { glb_url: "/models/test.glb" } });
  const res = await request(app).post("/api/generate").send({ prompt: "test" });
  expect(res.status).toBe(200);
  expect(res.body.glb_url).toBe("/models/test.glb");
});

test("GET /api/status returns job", async () => {
  db.query.mockResolvedValueOnce({
    rows: [{ job_id: "1", status: "complete", model_url: "url" }],
  });
  const res = await request(app).get("/api/status/1");
  expect(res.status).toBe(200);
  expect(res.body.status).toBe("complete");
});

test("Stripe create-order flow", async () => {
  db.query.mockResolvedValueOnce({ rows: [{ job_id: "1" }] });
  db.query.mockResolvedValueOnce({});
  const res = await request(app)
    .post("/api/create-order")
    .send({ jobId: "1", price: 100 });
  expect(res.status).toBe(200);
  expect(res.body.checkoutUrl).toBe("https://stripe.test");
});

test("POST /api/register returns token", async () => {
  db.query.mockResolvedValueOnce({ rows: [{ id: "u1", username: "alice" }] });
  const res = await request(app)
    .post("/api/register")
    .send({ username: "alice", email: "a@a.com", password: "p" });
  expect(res.status).toBe(200);
  expect(res.body.token).toBeDefined();
});

const bcrypt = require("bcryptjs");

test("POST /api/login returns token", async () => {
  db.query.mockResolvedValueOnce({
    rows: [
      { id: "u1", username: "alice", password_hash: bcrypt.hashSync("p", 10) },
    ],
  });
  const res = await request(app)
    .post("/api/login")
    .send({ username: "alice", password: "p" });
  expect(res.status).toBe(200);
  expect(res.body.token).toBeDefined();
});

test("Stripe webhook updates order and enqueues print", async () => {
  db.query.mockResolvedValueOnce({});
  const payload = JSON.stringify({});
  const res = await request(app)
    .post("/api/webhook/stripe")
    .set("stripe-signature", "sig")
    .set("Content-Type", "application/json")
    .send(payload);
  expect(res.status).toBe(200);
  expect(enqueuePrint).toHaveBeenCalledWith("job1");
});

test("POST /api/generate accepts image upload", async () => {
  const chunks = [];
  jest.spyOn(fs, "createWriteStream").mockImplementation(() => {
    const writable = new stream.Writable({
      write(chunk, enc, cb) {
        chunks.push(chunk);
        cb();
      },
    });
    return writable;
  });

  jest.spyOn(fs, "createReadStream").mockImplementation(() => {
    const readable = new stream.Readable({
      read() {
        this.push(Buffer.concat(chunks));
        this.push(null);
      },
    });
    return readable;
  });

  jest.spyOn(fs, "unlink").mockImplementation((_, cb) => cb && cb());

  axios.post.mockResolvedValue({ data: { glb_url: "/models/test.glb" } });
  const res = await request(app)
    .post("/api/generate")
    .field("prompt", "img test")
    .attach("images", Buffer.from("fake"), "test.png");

  expect(res.status).toBe(200);
  expect(res.body.glb_url).toBe("/models/test.glb");

  const insertCall = db.query.mock.calls.find((c) =>
    c[0].includes("INSERT INTO jobs"),
  );
  expect(insertCall[1][2]).toEqual(expect.any(String));
});

test("POST /api/community submits model", async () => {
  db.query.mockResolvedValueOnce({});
  const token = jwt.sign({ id: "u1" }, "secret");
  const res = await request(app)
    .post("/api/community")
    .set("authorization", `Bearer ${token}`)
    .send({ jobId: "j1" });
  expect(res.status).toBe(201);
});

test("GET /api/community/recent returns creations", async () => {
  db.query.mockResolvedValueOnce({ rows: [] });
  const res = await request(app).get("/api/community/recent");
  expect(res.status).toBe(200);
});

test("Admin create competition", async () => {
  db.query.mockResolvedValueOnce({ rows: [{}] });
  const res = await request(app)
    .post("/api/admin/competitions")
    .set("x-admin-token", "admin")
    .send({ name: "Test", start_date: "2025-01-01", end_date: "2025-01-31" });
  expect(res.status).toBe(200);
});

test("registration missing username", async () => {
  const res = await request(app)
    .post("/api/register")
    .send({ email: "a@a.com", password: "p" });
  expect(res.status).toBe(400);
});

test("registration missing email", async () => {
  const res = await request(app)
    .post("/api/register")
    .send({ username: "a", password: "p" });
  expect(res.status).toBe(400);
});

test("registration missing password", async () => {
  const res = await request(app)
    .post("/api/register")
    .send({ username: "a", email: "a@a.com" });
  expect(res.status).toBe(400);
});

test("registration duplicate username", async () => {
  db.query.mockRejectedValueOnce(new Error("duplicate key"));
  const res = await request(app)
    .post("/api/register")
    .send({ username: "a", email: "a@a.com", password: "p" });
  expect(res.status).toBe(500);
});

test("login invalid password", async () => {
  db.query.mockResolvedValueOnce({
    rows: [
      { id: "u1", username: "alice", password_hash: bcrypt.hashSync("p", 10) },
    ],
  });
  const res = await request(app)
    .post("/api/login")
    .send({ username: "alice", password: "wrong" });
  expect(res.status).toBe(401);
});

test("login missing fields", async () => {
  const res = await request(app).post("/api/login").send({ username: "" });
  expect(res.status).toBe(400);
});

test("/api/generate 400 when no prompt or image", async () => {
  const res = await request(app).post("/api/generate").send({});
  expect(res.status).toBe(400);
});

test("/api/generate falls back on server failure", async () => {
  axios.post.mockRejectedValueOnce(new Error("fail"));
  const res = await request(app).post("/api/generate").send({ prompt: "t" });
  expect(res.status).toBe(200);
  expect(res.body.glb_url).toBe(
    "https://modelviewer.dev/shared-assets/models/Astronaut.glb",
  );
});

test("/api/generate saves authenticated user id", async () => {
  axios.post.mockResolvedValueOnce({ data: { glb_url: "/m.glb" } });
  const token = jwt.sign({ id: "u1" }, "secret");
  await request(app)
    .post("/api/generate")
    .set("authorization", `Bearer ${token}`)
    .send({ prompt: "t" });
  const insertCall = db.query.mock.calls.find((c) =>
    c[0].includes("INSERT INTO jobs"),
  );
  expect(insertCall[1][4]).toBe("u1");
});

test("/api/status supports limit and offset", async () => {
  db.query.mockResolvedValueOnce({ rows: [] });
  await request(app).get("/api/status?limit=5&offset=2");
  expect(db.query).toHaveBeenCalledWith(
    "SELECT * FROM jobs ORDER BY created_at DESC LIMIT $1 OFFSET $2",
    [5, 2],
  );
});

test("/api/status/:id returns 404 when missing", async () => {
  db.query.mockResolvedValueOnce({ rows: [] });
  const res = await request(app).get("/api/status/bad");
  expect(res.status).toBe(404);
});

test("GET /api/profile unauthorized", async () => {
  const res = await request(app).get("/api/profile");
  expect(res.status).toBe(401);
});

test("GET /api/profile returns data", async () => {
  db.query.mockResolvedValueOnce({
    rows: [{ id: "u1", username: "alice", email: "a@a.com" }],
  });
  const token = jwt.sign({ id: "u1" }, "secret");
  const res = await request(app)
    .get("/api/profile")
    .set("authorization", `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body.username).toBe("alice");
});

test("PUT /api/profile updates profile", async () => {
  db.query.mockResolvedValueOnce({ rows: [{ id: "u1" }] });
  const token = jwt.sign({ id: "u1" }, "secret");
  const res = await request(app)
    .put("/api/profile")
    .set("authorization", `Bearer ${token}`)
    .send({ email: "new@a.com" });
  expect(res.status).toBe(200);
  const updateCall = db.query.mock.calls.find((c) =>
    c[0].includes("UPDATE users"),
  );
  expect(updateCall).toBeTruthy();
});

test("GET /api/users/:user/profile public fetch", async () => {
  db.query.mockResolvedValueOnce({
    rows: [{ id: "u2", username: "bob", email: "b@b.com" }],
  });
  const res = await request(app).get("/api/users/bob/profile");
  expect(res.status).toBe(200);
  expect(res.body.username).toBe("bob");
});
