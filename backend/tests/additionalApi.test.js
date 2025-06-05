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
  checkout: { sessions: { create: jest.fn() } },
  webhooks: { constructEvent: jest.fn(() => ({ type: "noop" })) },
};
Stripe.mockImplementation(() => stripeMock);

const { progressEmitter } = require("../queue/printQueue");

const request = require("supertest");
const app = require("../server");

beforeEach(() => {
  db.query.mockClear();
  axios.post.mockClear();
  stripeMock.checkout.sessions.create.mockResolvedValue({
    id: "cs_test",
    url: "https://stripe.test",
  });
});

test("GET /api/my/models returns models", async () => {
  db.query.mockResolvedValueOnce({ rows: [{ job_id: "j1" }] });
  const token = jwt.sign({ id: "u1" }, "secret");
  const res = await request(app)
    .get("/api/my/models")
    .set("authorization", `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body[0].job_id).toBe("j1");
});

test("GET /api/my/models requires auth", async () => {
  const res = await request(app).get("/api/my/models");
  expect(res.status).toBe(401);
});

test("GET /api/profile returns profile", async () => {
  db.query.mockResolvedValueOnce({ rows: [{ display_name: "A" }] });
  const token = jwt.sign({ id: "u1" }, "secret");
  const res = await request(app)
    .get("/api/profile")
    .set("authorization", `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body.display_name).toBe("A");
});

test("GET /api/profile 404 when missing", async () => {
  db.query.mockResolvedValueOnce({ rows: [] });
  const token = jwt.sign({ id: "u1" }, "secret");
  const res = await request(app)
    .get("/api/profile")
    .set("authorization", `Bearer ${token}`);
  expect(res.status).toBe(404);
});

test("GET /api/users/:username/models returns models", async () => {
  db.query
    .mockResolvedValueOnce({ rows: [{ id: "u1" }] })
    .mockResolvedValueOnce({ rows: [{ job_id: "j1", likes: 0 }] });
  const res = await request(app).get("/api/users/alice/models");
  expect(res.status).toBe(200);
  expect(res.body[0].job_id).toBe("j1");
});

test("GET /api/users/:username/models 404 when missing", async () => {
  db.query.mockResolvedValueOnce({ rows: [] });
  const res = await request(app).get("/api/users/missing/models");
  expect(res.status).toBe(404);
});

test("POST /api/models/:id/like adds like", async () => {
  db.query
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({})
    .mockResolvedValueOnce({ rows: [{ count: "1" }] });
  const token = jwt.sign({ id: "u1" }, "secret");
  const res = await request(app)
    .post("/api/models/j1/like")
    .set("authorization", `Bearer ${token}`)
    .send();
  expect(res.status).toBe(200);
  expect(res.body.likes).toBe(1);
});

test("POST /api/models/:id/like removes like", async () => {
  db.query
    .mockResolvedValueOnce({ rows: [{}] })
    .mockResolvedValueOnce({})
    .mockResolvedValueOnce({ rows: [{ count: "0" }] });
  const token = jwt.sign({ id: "u1" }, "secret");
  const res = await request(app)
    .post("/api/models/j1/like")
    .set("authorization", `Bearer ${token}`)
    .send();
  expect(res.status).toBe(200);
  expect(res.body.likes).toBe(0);
});

test("POST /api/models/:id/like requires auth", async () => {
  const res = await request(app).post("/api/models/j1/like").send();
  expect(res.status).toBe(401);
});

test("GET /api/community/popular uses correct ordering", async () => {
  db.query.mockResolvedValueOnce({ rows: [] });
  await request(app).get("/api/community/popular?limit=1&offset=0");
  expect(db.query).toHaveBeenCalledWith(
    expect.stringContaining("likes DESC, c.created_at DESC"),
    [1, 0, null, null],
  );
});

test("GET /api/competitions/active", async () => {
  db.query.mockResolvedValueOnce({ rows: [] });
  const res = await request(app).get("/api/competitions/active");
  expect(res.status).toBe(200);
});

test("GET /api/competitions/:id/entries", async () => {
  db.query.mockResolvedValueOnce({ rows: [{ model_id: "m1", likes: 3 }] });
  const res = await request(app).get("/api/competitions/5/entries");
  expect(res.status).toBe(200);
  expect(res.body[0].likes).toBe(3);
});

test("POST /api/competitions/:id/enter", async () => {
  db.query.mockResolvedValueOnce({});
  const token = jwt.sign({ id: "u1" }, "secret");
  const res = await request(app)
    .post("/api/competitions/5/enter")
    .set("authorization", `Bearer ${token}`)
    .send({ modelId: "m1" });
  expect(res.status).toBe(201);
});

test("DELETE /api/admin/competitions/:id", async () => {
  db.query.mockResolvedValueOnce({});
  const res = await request(app)
    .delete("/api/admin/competitions/5")
    .set("x-admin-token", "admin");
  expect(res.status).toBe(204);
});

test("SSE progress endpoint streams updates", async () => {
  const req = request(app).get("/api/progress/job1");
  setTimeout(() => {
    progressEmitter.emit("progress", { jobId: "job1", progress: 100 });
  }, 10);
  const res = await req;
  expect(res.text).toContain('data: {"jobId":"job1","progress":100}');
});
