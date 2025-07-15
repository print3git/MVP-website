process.env.STRIPE_SECRET_KEY = "test";
process.env.STRIPE_WEBHOOK_SECRET = "whsec";
process.env.DB_URL = "postgres://user:pass@localhost/db";
process.env.AWS_REGION = "us-east-1";
process.env.S3_BUCKET = "bucket";
const originalNodeEnv = process.env.NODE_ENV;
process.env.NODE_ENV = "production";

jest.mock("../db", () => ({
  query: jest.fn(),
}));
const db = require("../db");

jest.mock("@aws-sdk/client-s3", () => {
  const actual = jest.requireActual("@aws-sdk/client-s3");
  const send = jest.fn().mockResolvedValue({});
  return {
    ...actual,
    S3Client: jest.fn().mockImplementation(() => ({ send })),
  };
});
const request = require("supertest");
const app = require("../server");

beforeEach(() => {
  db.query.mockClear();
  if (console.error.mockRestore) console.error.mockRestore();
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterAll(() => {
  process.env.NODE_ENV = originalNodeEnv;
});

test("GET /api/health returns ok", async () => {
  db.query.mockResolvedValueOnce({ rows: [] });
  const res = await request(app).get("/api/health");
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ db: "ok", s3: "ok" });
  expect(db.query).toHaveBeenCalledWith("SELECT 1");
});

test("GET /api/health returns 500 on db error", async () => {
  db.query.mockRejectedValueOnce(new Error("fail"));
  const res = await request(app).get("/api/health");
  expect(res.status).toBe(500);
  expect(res.body.error).toBe("unhealthy");
});

test("GET /api/health returns 500 on s3 error", async () => {
  db.query.mockResolvedValueOnce({ rows: [] });
  const { S3Client } = require("@aws-sdk/client-s3");
  const send = S3Client.mock.results[0].value.send;
  send.mockRejectedValueOnce(new Error("s3fail"));
  const res = await request(app).get("/api/health");
  expect(res.status).toBe(500);
  expect(res.body.error).toBe("unhealthy");
});
