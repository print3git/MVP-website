process.env.STRIPE_SECRET_KEY = "test";
process.env.STRIPE_WEBHOOK_SECRET = "whsec";
process.env.DB_URL = "postgres://user:pass@localhost/db";
process.env.AWS_REGION = "us-east-1";
process.env.S3_BUCKET = "bucket";

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
});

test("GET /api/health returns ok", async () => {
  db.query.mockResolvedValueOnce({ rows: [] });
  const res = await request(app).get("/api/health");
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ db: "ok", s3: "ok" });
  expect(db.query).toHaveBeenCalledWith("SELECT 1");
});
