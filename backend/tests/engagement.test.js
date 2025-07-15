process.env.STRIPE_SECRET_KEY = "test";
process.env.STRIPE_WEBHOOK_SECRET = "whsec";
process.env.DB_URL = "postgres://user:pass@localhost/db";

jest.mock("../db", () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
  getLeaderboard: jest.fn(),
  getAchievements: jest.fn(),
}));
const db = require("../db");

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../server");

beforeEach(() => {
  jest.clearAllMocks();
});

test("GET /api/leaderboard returns list", async () => {
  db.getLeaderboard.mockResolvedValue([{ username: "alice", points: 5 }]);
  const res = await request(app).get("/api/leaderboard?limit=5");
  expect(res.status).toBe(200);
  expect(res.body[0].username).toBe("alice");
  expect(db.getLeaderboard).toHaveBeenCalledWith(5);
});

test("GET /api/achievements requires auth", async () => {
  const res = await request(app).get("/api/achievements");
  expect(res.status).toBe(401);
});

test("GET /api/achievements returns list", async () => {
  db.getAchievements.mockResolvedValue([{ name: "First Print" }]);
  const token = jwt.sign({ id: "u1" }, process.env.AUTH_SECRET || "secret");
  const res = await request(app)
    .get("/api/achievements")
    .set("authorization", `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body.achievements).toHaveLength(1);
  expect(db.getAchievements).toHaveBeenCalledWith("u1");
});
