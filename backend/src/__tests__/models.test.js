process.env.DB_ENDPOINT = "postgres://user:pass@localhost/db";
process.env.DB_PASSWORD = "pass";
process.env.CLOUDFRONT_DOMAIN = "cdn.example.com";
process.env.STRIPE_TEST_KEY = "sk_test";

jest.mock("pg");
const { Pool } = require("pg");
const mPool = { query: jest.fn() };
Pool.mockImplementation(() => mPool);

const request = require("supertest");
const app = require("../app");

afterEach(() => {
  jest.clearAllMocks();
});

test("POST /api/models inserts model and returns 201", async () => {
  const rows = [
    { id: 1, prompt: "p", url: "https://cdn.example.com/file.glb" },
  ];
  mPool.query.mockResolvedValueOnce({ rows });
  const res = await request(app)
    .post("/api/models")
    .send({ prompt: "p", fileKey: "file.glb" });
  expect(res.status).toBe(201);
  expect(res.body).toEqual(rows[0]);
  expect(mPool.query).toHaveBeenCalledWith(
    "INSERT INTO models (prompt, url) VALUES ($1, $2) RETURNING *",
    ["p", "https://cdn.example.com/file.glb"],
  );
});

test("POST /api/models returns 400 when data missing", async () => {
  let res = await request(app).post("/api/models").send({ prompt: "a" });
  expect(res.status).toBe(400);
  res = await request(app).post("/api/models").send({ fileKey: "f" });
  expect(res.status).toBe(400);
});

test("POST /api/models returns 500 on db error", async () => {
  mPool.query.mockRejectedValueOnce(new Error("fail"));
  const res = await request(app)
    .post("/api/models")
    .send({ prompt: "p", fileKey: "file.glb" });
  expect(res.status).toBe(500);
  expect(res.body.error).toBe("Internal Server Error");
});
