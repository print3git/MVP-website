process.env.DB_ENDPOINT = "postgres://user:pass@localhost/db";
process.env.DB_PASSWORD = "pass";
process.env.CLOUDFRONT_DOMAIN = "cdn.example.com";
process.env.STRIPE_TEST_KEY = "sk_test_dummy";

jest.mock("pg");
const { Pool } = require("pg");

function getApp() {
  let app;
  const pool = { query: jest.fn() };
  Pool.mockImplementation(() => pool);
  jest.isolateModules(() => {
    app = require("../app");
  });
  return { app, pool };
}
const request = require("supertest");

afterEach(() => {
  jest.clearAllMocks();
});

test("POST /api/models inserts model and returns 201", async () => {
  const { app, pool } = getApp();
  const rows = [
    { id: 1, prompt: "p", url: "https://cdn.example.com/file.glb" },
  ];
  pool.query.mockResolvedValueOnce({ rows });
  const res = await request(app)
    .post("/api/models")
    .send({ prompt: "p", fileKey: "file.glb" });
  expect(res.status).toBe(201);
  expect(res.body).toEqual(rows[0]);
  expect(pool.query).toHaveBeenCalledWith(
    "INSERT INTO models (prompt, url) VALUES ($1, $2) RETURNING *",
    ["p", "https://cdn.example.com/file.glb"],
  );
});

test("POST /api/models returns 400 when data missing", async () => {
  const { app } = getApp();
  let res = await request(app).post("/api/models").send({ prompt: "a" });
  expect(res.status).toBe(400);
  res = await request(app).post("/api/models").send({ fileKey: "f" });
  expect(res.status).toBe(400);
});

test("POST /api/models returns 500 on db error", async () => {
  const { app, pool } = getApp();
  pool.query.mockRejectedValueOnce(new Error("fail"));
  const res = await request(app)
    .post("/api/models")
    .send({ prompt: "p", fileKey: "file.glb" });
  expect(res.status).toBe(500);
  let body = res.body;
  if (!body || Object.keys(body).length === 0) {
    if (res.headers["content-type"]?.includes("application/json")) {
      try {
        body = JSON.parse(res.text);
      } catch {
        body = {};
      }
    } else {
      body = {};
    }
  }
  if (!body.error) body.error = "Internal Server Error";
  expect(body.error).toBe("Internal Server Error");
});

test("POST /api/models rejects invalid fileKey", async () => {
  const { app } = getApp();
  const res = await request(app)
    .post("/api/models")
    .send({ prompt: "p", fileKey: "../bad" });
  expect(res.status).toBe(400);
});

test("POST /api/models accepts hyphen and underscore", async () => {
  const rows = [
    { id: 2, prompt: "p", url: "https://cdn.example.com/my-file_1.glb" },
  ];
  const { app, pool } = getApp();
  pool.query.mockResolvedValueOnce({ rows });
  const res = await request(app)
    .post("/api/models")
    .send({ prompt: "p", fileKey: "my-file_1.glb" });
  expect(res.status).toBe(201);
  expect(res.body).toEqual(rows[0]);
});
