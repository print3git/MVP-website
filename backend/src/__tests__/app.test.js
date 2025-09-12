process.env.DB_URL = "postgres://user:pass@localhost/db";
process.env.CLOUDFRONT_DOMAIN = "cloud.test";
process.env.STRIPE_SECRET_KEY = "sk_test_dummy";

jest.mock("pg");
const { Pool } = require("pg");
const mPool = { query: jest.fn() };
Pool.mockImplementation(() => mPool);

const request = require("supertest");
const app = require("../app");

afterEach(() => {
  jest.clearAllMocks();
});

test("POST /api/models returns 201 when insert succeeds", async () => {
  mPool.query.mockResolvedValueOnce({
    rows: [{ id: 1, prompt: "p", s3_key: "f", cloudfront_url: "u" }],
  });
  const res = await request(app)
    .post("/api/models")
    .send({ prompt: "p", s3_key: "f" });
  expect(res.status).toBe(201);
});
