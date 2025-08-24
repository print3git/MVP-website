process.env.STRIPE_SECRET_KEY = "test";
process.env.STRIPE_WEBHOOK_SECRET = "whsec";
process.env.DB_URL = "postgres://user:pass@localhost/db";
const originalNodeEnv = process.env.NODE_ENV;
process.env.NODE_ENV = "production";

jest.mock("../db", () => ({
  query: jest.fn(),
}));
const db = require("../db");

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
  expect(res.body).toEqual({ ok: true });
  expect(db.query).toHaveBeenCalledWith("SELECT 1");
});

test("GET /api/health returns 500 on db error", async () => {
  db.query.mockRejectedValueOnce(new Error("fail"));
  const res = await request(app).get("/api/health");
  expect(res.status).toBe(500);
  expect(res.text).toBe("fail");
});
