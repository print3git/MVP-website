process.env.STRIPE_SECRET_KEY = "test";
process.env.STRIPE_WEBHOOK_SECRET = "whsec";
process.env.DB_URL = "postgres://user:pass@localhost/db";

jest.mock("../db", () => ({
  listGenerationLogs: jest.fn(),
  getGenerationStats: jest.fn(),
}));
const db = require("../db");
const request = require("supertest");
const app = require("../server");

describe("analytics endpoint", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("requires admin token", async () => {
    const res = await request(app).get("/api/admin/analytics");
    expect(res.status).toBe(401);
  });

  test("returns logs and stats", async () => {
    db.listGenerationLogs.mockResolvedValueOnce([
      {
        id: 1,
        prompt: "p",
        start_time: "2024-01-01T00:00:00Z",
        finish_time: "2024-01-01T00:00:10Z",
        source: "sparc3d",
        cost_cents: 50,
      },
    ]);
    db.getGenerationStats.mockResolvedValueOnce({
      total: 1,
      avg_duration: 10,
      total_cost: 50,
    });
    const res = await request(app)
      .get("/api/admin/analytics")
      .set("x-admin-token", "admin");
    expect(res.status).toBe(200);
    expect(res.body.logs.length).toBe(1);
    expect(res.body.stats.total).toBe(1);
  });
});
