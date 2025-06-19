process.env.STRIPE_SECRET_KEY = "test";
process.env.STRIPE_WEBHOOK_SECRET = "whsec";
process.env.DB_URL = "postgres://user:pass@localhost/db";
process.env.HUNYUAN_API_KEY = "test";
process.env.HUNYUAN_SERVER_URL = "http://localhost:4000";

jest.mock("../db", () => ({
  query: jest.fn(),
  insertCommission: jest.fn(),
  insertAdClick: jest.fn(),
  insertCartEvent: jest.fn(),
  insertCheckoutEvent: jest.fn(),
  insertShareEvent: jest.fn(),
  insertPageView: jest.fn(),
  getConversionMetrics: jest.fn(),
  getProfitMetrics: jest.fn(),
  getBusinessIntelligenceMetrics: jest.fn(),
  getDailyProfitSeries: jest.fn(),
  getDailyCapacityUtilizationSeries: jest.fn(),
  getOrCreateOrderReferralLink: jest.fn(),
  insertReferredOrder: jest.fn(),
}));
const db = require("../db");

const request = require("supertest");
const app = require("../server");

beforeEach(() => {
  jest.clearAllMocks();
});

test("POST /api/track/ad-click records click", async () => {
  const res = await request(app)
    .post("/api/track/ad-click")
    .send({ subreddit: "funny", sessionId: "s1" });
  expect(res.status).toBe(200);
  expect(db.insertAdClick).toHaveBeenCalledWith("funny", "s1");
});

test("POST /api/track/cart records cart event", async () => {
  const res = await request(app)
    .post("/api/track/cart")
    .send({ sessionId: "s1", modelId: "m1", subreddit: "funny" });
  expect(res.status).toBe(200);
  expect(db.insertCartEvent).toHaveBeenCalledWith("s1", "m1", "funny");
});

test("POST /api/track/checkout records step", async () => {
  const res = await request(app)
    .post("/api/track/checkout")
    .send({ sessionId: "s1", subreddit: "funny", step: "start" });
  expect(res.status).toBe(200);
  expect(db.insertCheckoutEvent).toHaveBeenCalledWith("s1", "funny", "start");
});

test("POST /api/track/share records event", async () => {
  const res = await request(app)
    .post("/api/track/share")
    .send({ shareId: "sh1", network: "facebook" });
  expect(res.status).toBe(200);
  expect(db.insertShareEvent).toHaveBeenCalledWith("sh1", "facebook");
});

test("POST /api/track/page records view", async () => {
  const res = await request(app).post("/api/track/page").send({
    sessionId: "s1",
    subreddit: "funny",
    utmSource: "g",
    utmMedium: "cpc",
    utmCampaign: "summer",
  });
  expect(res.status).toBe(200);
  expect(db.insertPageView).toHaveBeenCalledWith(
    "s1",
    "funny",
    "g",
    "cpc",
    "summer",
  );
});

test("GET /api/metrics/conversion returns metrics", async () => {
  db.getConversionMetrics.mockResolvedValue([
    { subreddit: "funny", atcRate: 0.5 },
  ]);
  const res = await request(app).get("/api/metrics/conversion");
  expect(res.status).toBe(200);
  expect(res.body[0].subreddit).toBe("funny");
  expect(db.getConversionMetrics).toHaveBeenCalled();
});

test("GET /api/metrics/profit returns data", async () => {
  db.getProfitMetrics.mockResolvedValue([{ subreddit: "funny", profit: 100 }]);
  const res = await request(app).get("/api/metrics/profit");
  expect(res.status).toBe(200);
  expect(res.body[0].profit).toBe(100);
  expect(db.getProfitMetrics).toHaveBeenCalled();
});

test("GET /api/metrics/business-intel returns data", async () => {
  db.getBusinessIntelligenceMetrics.mockResolvedValue([
    { subreddit: "funny", cac: 1, roas: 2, profit: 3 },
  ]);
  const res = await request(app).get("/api/metrics/business-intel");
  expect(res.status).toBe(200);
  expect(res.body[0].cac).toBe(1);
  expect(db.getBusinessIntelligenceMetrics).toHaveBeenCalled();
});

test("GET /api/metrics/daily-profit returns data", async () => {
  db.getDailyProfitSeries.mockResolvedValue([{ day: "2024-01-01", profit: 5 }]);
  const res = await request(app).get("/api/metrics/daily-profit");
  expect(res.status).toBe(200);
  expect(res.body[0].profit).toBe(5);
  expect(db.getDailyProfitSeries).toHaveBeenCalled();
});

test("GET /api/metrics/daily-capacity returns data", async () => {
  db.getDailyCapacityUtilizationSeries.mockResolvedValue([
    { day: "2024-01-01", utilization: 0.8 },
  ]);
  const res = await request(app).get("/api/metrics/daily-capacity");
  expect(res.status).toBe(200);
  expect(res.body[0].utilization).toBe(0.8);
  expect(db.getDailyCapacityUtilizationSeries).toHaveBeenCalled();
});
