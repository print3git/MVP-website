process.env.STRIPE_SECRET_KEY = "test";
process.env.STRIPE_WEBHOOK_SECRET = "whsec";
process.env.DB_URL = "postgres://user:pass@localhost/db";
process.env.HUNYUAN_API_KEY = "test";
process.env.HUNYUAN_SERVER_URL = "http://localhost:4000";

jest.mock("../db", () => ({
  getPrinter: jest.fn(),
}));
const db = require("../db");
const request = require("supertest");
const app = require("../server");

beforeEach(() => {
  jest.clearAllMocks();
});

test("GET /api/admin/printers/:id/stream requires admin", async () => {
  const res = await request(app).get("/api/admin/printers/1/stream");
  expect(res.status).toBe(401);
});

test("GET /api/admin/printers/:id/stream returns URL", async () => {
  db.getPrinter.mockResolvedValueOnce({ id: 1, serial: "p1" });
  const res = await request(app)
    .get("/api/admin/printers/1/stream")
    .set("x-admin-token", "admin");
  expect(res.status).toBe(200);
  expect(res.body.streamUrl).toBe("http://p1.local:8080/stream");
});
