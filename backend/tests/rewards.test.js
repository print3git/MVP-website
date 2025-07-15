process.env.STRIPE_SECRET_KEY = "test";
process.env.STRIPE_WEBHOOK_SECRET = "whsec";
process.env.DB_URL = "postgres://user:pass@localhost/db";

jest.mock("../db", () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
  insertCommission: jest.fn(),
  getOrCreateReferralLink: jest.fn(),
  getRewardPoints: jest.fn(),
  adjustRewardPoints: jest.fn(),
  getRewardOption: jest.fn(),
  getRewardOptions: jest.fn(),
  getUserIdForReferral: jest.fn(),
  insertReferralEvent: jest.fn(),
  getOrCreateOrderReferralLink: jest.fn(),
  insertReferredOrder: jest.fn(),
}));
const db = require("../db");
jest.mock("../discountCodes", () => ({
  createTimedCode: jest.fn().mockResolvedValue("DISC123"),
}));
const { createTimedCode } = require("../discountCodes");

const jwt = require("jsonwebtoken");
const request = require("supertest");
const app = require("../server");

beforeEach(() => {
  jest.clearAllMocks();
});

test("GET /api/referral-link returns code", async () => {
  db.getOrCreateReferralLink.mockResolvedValue("abc123");
  const token = jwt.sign({ id: "u1" }, process.env.AUTH_SECRET || "secret");
  const res = await request(app)
    .get("/api/referral-link")
    .set("authorization", `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body.code).toBe("abc123");
  expect(db.getOrCreateReferralLink).toHaveBeenCalledWith("u1");
});

test("GET /api/rewards returns points", async () => {
  db.getRewardPoints.mockResolvedValue(42);
  const token = jwt.sign({ id: "u1" }, process.env.AUTH_SECRET || "secret");
  const res = await request(app)
    .get("/api/rewards")
    .set("authorization", `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body.points).toBe(42);
  expect(db.getRewardPoints).toHaveBeenCalledWith("u1");
});

test("POST /api/rewards/redeem returns code", async () => {
  db.getRewardPoints.mockResolvedValue(150);
  db.getRewardOption.mockResolvedValue({ amount_cents: 500 });
  const token = jwt.sign({ id: "u1" }, process.env.AUTH_SECRET || "secret");
  const res = await request(app)
    .post("/api/rewards/redeem")
    .set("authorization", `Bearer ${token}`)
    .send({ points: 100 });
  expect(res.status).toBe(200);
  expect(res.body.code).toBe("DISC123");
  expect(db.adjustRewardPoints).toHaveBeenCalledWith("u1", -100);
  expect(db.getRewardOption).toHaveBeenCalledWith(100);
  expect(createTimedCode).toHaveBeenCalled();
});

test("POST /api/referral-click records event", async () => {
  db.getUserIdForReferral.mockResolvedValue("u1");
  const res = await request(app)
    .post("/api/referral-click")
    .send({ code: "abc" });
  expect(res.status).toBe(200);
  expect(db.insertReferralEvent).toHaveBeenCalledWith("u1", "click");
});

test("GET /api/rewards/options returns list", async () => {
  db.getRewardOptions.mockResolvedValue([{ points: 100, amount_cents: 500 }]);
  const res = await request(app).get("/api/rewards/options");
  expect(res.status).toBe(200);
  expect(res.body.options).toHaveLength(1);
  expect(db.getRewardOptions).toHaveBeenCalled();
});

test("POST /api/referral-signup grants codes", async () => {
  db.getUserIdForReferral.mockResolvedValue("u1");
  const res = await request(app)
    .post("/api/referral-signup")
    .send({ code: "abc" });
  expect(res.status).toBe(200);
  expect(db.insertReferralEvent).toHaveBeenCalledWith("u1", "signup");
  const incentive = db.query.mock.calls.find((c) =>
    c[0].includes("INSERT INTO incentives"),
  );
  expect(incentive[1][0]).toBe("u1");
  expect(incentive[1][1]).toMatch(/^referral_/);
  expect(res.body.code).toBe("DISC123");
  expect(createTimedCode).toHaveBeenCalledTimes(2);
  expect(createTimedCode).toHaveBeenNthCalledWith(1, 300, 168);
  expect(createTimedCode).toHaveBeenNthCalledWith(2, 300, 168);
});

test("GET /api/orders/:id/referral-link returns code", async () => {
  db.query.mockResolvedValueOnce({ rows: [{ user_id: "u1" }] });
  db.getOrCreateOrderReferralLink.mockResolvedValue("orderabc");
  const token = jwt.sign({ id: "u1" }, process.env.AUTH_SECRET || "secret");
  const res = await request(app)
    .get("/api/orders/o1/referral-link")
    .set("authorization", `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body.code).toBe("orderabc");
  expect(db.getOrCreateOrderReferralLink).toHaveBeenCalledWith("o1");
});

test("GET /api/orders/:id/referral-qr returns png", async () => {
  db.query.mockResolvedValueOnce({ rows: [{ user_id: "u1" }] });
  db.getOrCreateOrderReferralLink.mockResolvedValue("orderabc");
  const token = jwt.sign({ id: "u1" }, process.env.AUTH_SECRET || "secret");
  const res = await request(app)
    .get("/api/orders/o1/referral-qr")
    .set("authorization", `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.headers["content-type"]).toBe("image/png");
  expect(db.getOrCreateOrderReferralLink).toHaveBeenCalledWith("o1");
});
