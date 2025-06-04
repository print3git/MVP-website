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
