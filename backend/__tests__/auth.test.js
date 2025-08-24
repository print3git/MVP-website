const request = require("supertest");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

jest.mock("../db", () => ({
  query: jest.fn(),
}));

const db = require("../db");

let app;
const AUTH_SECRET = process.env.AUTH_SECRET || "secret";

beforeAll(() => {
  process.env.NODE_ENV = "test";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec";
  process.env.S3_BUCKET = "test-bucket";
  process.env.CLOUDFRONT_MODEL_DOMAIN = "cdn.test";
  app = require("../server");
});

afterEach(() => {
  jest.clearAllMocks();
});

test("login success returns token", async () => {
  db.query.mockResolvedValueOnce({
    rows: [
      {
        id: "u1",
        username: "alice",
        password_hash: bcrypt.hashSync("p", 10),
        is_admin: false,
      },
    ],
  });
  const res = await request(app)
    .post("/api/login")
    .send({ username: "alice", password: "p" });
  expect(res.status).toBe(200);
  expect(res.body.token).toBeDefined();
  expect(res.body.isAdmin).toBe(false);
});

test("login rejects invalid password", async () => {
  db.query.mockResolvedValueOnce({
    rows: [
      {
        id: "u1",
        username: "alice",
        password_hash: bcrypt.hashSync("p", 10),
        is_admin: false,
      },
    ],
  });
  const res = await request(app)
    .post("/api/login")
    .send({ username: "alice", password: "wrong" });
  expect(res.status).toBe(401);
});

test("/api/me rejects missing token", async () => {
  const res = await request(app).get("/api/me");
  expect(res.status).toBe(401);
});

test("/api/me rejects invalid token", async () => {
  const token = jwt.sign({ id: "u1" }, "wrong");
  const res = await request(app)
    .get("/api/me")
    .set("Authorization", `Bearer ${token}`);
  expect(res.status).toBe(401);
});

test("/api/me returns user for valid token", async () => {
  db.query
    .mockResolvedValueOnce({
      rows: [{ id: "u1", username: "alice", email: "a@a.com" }],
    })
    .mockResolvedValueOnce({ rows: [{ display_name: "Alice" }] });
  const token = jwt.sign({ id: "u1" }, AUTH_SECRET);
  const res = await request(app)
    .get("/api/me")
    .set("Authorization", `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body.username).toBe("alice");
  expect(res.body.email).toBe("a@a.com");
});
