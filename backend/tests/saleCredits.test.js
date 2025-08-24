process.env.STRIPE_SECRET_KEY = "test";
process.env.STRIPE_WEBHOOK_SECRET = "whsec";
process.env.DB_URL = "postgres://user:pass@localhost/db";

jest.mock("../db", () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
  insertCommission: jest.fn(),
  upsertSubscription: jest.fn(),
  cancelSubscription: jest.fn(),
  getSubscription: jest.fn(),
  ensureCurrentWeekCredits: jest.fn(),
  getCurrentWeekCredits: jest.fn(),
  incrementCreditsUsed: jest.fn(),
  upsertMailingListEntry: jest.fn(),
  confirmMailingListEntry: jest.fn(),
  unsubscribeMailingListEntry: jest.fn(),
  getUserCreations: jest.fn(),
  insertCommunityComment: jest.fn(),
  getCommunityComments: jest.fn(),
  insertSocialShare: jest.fn(),
  verifySocialShare: jest.fn(),
  getUserIdForReferral: jest.fn(),
  getOrCreateOrderReferralLink: jest.fn(),
  insertReferredOrder: jest.fn(),
  updateWeeklyOrderStreak: jest.fn(),
  getSaleCredit: jest.fn(),
  adjustSaleCredit: jest.fn(),
}));
const db = require("../db");

jest.mock("../discountCodes", () => ({
  createTimedCode: jest.fn().mockResolvedValue("DISC123"),
}));

jest.mock("stripe");
const Stripe = require("stripe");
const stripeMock = {
  checkout: { sessions: { create: jest.fn() } },
  webhooks: {
    constructEvent: jest.fn(() => ({
      type: "checkout.session.completed",
      data: { object: { id: "cs_test", metadata: { jobId: "job1" } } },
    })),
  },
};
Stripe.mockImplementation(() => stripeMock);

jest.mock("../queue/printQueue", () => ({
  enqueuePrint: jest.fn(),
  processQueue: jest.fn(),
  progressEmitter: new (require("events").EventEmitter)(),
  COMPLETE_EVENT: "complete",
}));
const { enqueuePrint } = require("../queue/printQueue");
jest.mock("../queue/dbPrintQueue", () => ({ enqueuePrint: jest.fn() }));
const { enqueuePrint: enqueueDbPrint } = require("../queue/dbPrintQueue");
jest.mock("../printers/slicer", () =>
  jest.fn().mockResolvedValue("/tmp/out.gcode"),
);
const sliceModel = require("../printers/slicer");
void enqueuePrint;
void enqueueDbPrint;
void sliceModel;

const jwt = require("jsonwebtoken");
const request = require("supertest");
const app = require("../server");

beforeEach(() => {
  jest.clearAllMocks();
});

test("Stripe webhook awards seller credit", async () => {
  db.query
    .mockResolvedValueOnce({})
    .mockResolvedValueOnce({
      rows: [
        { job_id: "job1", user_id: "buyer", shipping_info: {}, is_gift: false },
      ],
    })
    .mockResolvedValueOnce({
      rows: [{ model_url: "/tmp/model.stl", user_id: "seller" }],
    })
    .mockResolvedValueOnce({ rows: [{ count: "1" }] })
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({});
  const payload = JSON.stringify({});
  const res = await request(app)
    .post("/api/webhook/stripe")
    .set("stripe-signature", "sig")
    .set("Content-Type", "application/json")
    .send(payload);
  expect(res.status).toBe(200);
  expect(db.adjustSaleCredit).toHaveBeenCalledWith("seller", 500);
});

test("POST /api/credits/redeem deducts credit", async () => {
  db.getSaleCredit.mockResolvedValue(600);
  db.adjustSaleCredit.mockResolvedValue(100);
  const token = jwt.sign({ id: "u1" }, process.env.AUTH_SECRET || "secret");
  const res = await request(app)
    .post("/api/credits/redeem")
    .set("authorization", `Bearer ${token}`)
    .send({ amount_cents: 500 });
  expect(res.status).toBe(200);
  expect(db.adjustSaleCredit).toHaveBeenCalledWith("u1", -500);
  expect(res.body.credit).toBe(100);
});

test("GET /api/credits returns credit balance", async () => {
  db.getSaleCredit.mockResolvedValue(800);
  const token = jwt.sign({ id: "u1" }, process.env.AUTH_SECRET || "secret");
  const res = await request(app)
    .get("/api/credits")
    .set("authorization", `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body.credit).toBe(800);
});
