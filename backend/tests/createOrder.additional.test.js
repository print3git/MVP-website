process.env.STRIPE_SECRET_KEY = "test";
process.env.DB_URL = "postgres://user:pass@localhost/db";

jest.mock("../db", () => ({
  query: jest.fn(),
  getUserIdForReferral: jest.fn(),
  insertReferredOrder: jest.fn(),
  getSubscription: jest.fn(),
  ensureCurrentWeekCredits: jest.fn(),
  getCurrentWeekCredits: jest.fn(),
  incrementCreditsUsed: jest.fn(),
}));
const db = require("../db");

jest.mock("stripe");
const Stripe = require("stripe");
const stripeMock = {
  checkout: {
    sessions: { create: jest.fn().mockResolvedValue({ id: "cs", url: "url" }) },
  },
};
Stripe.mockImplementation(() => stripeMock);

const request = require("supertest");
const app = require("../server");
const jwt = require("jsonwebtoken");

describe("create-order extras", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("repeat customer does not get first order discount", async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ job_id: "1", user_id: "u1" }] })
      .mockResolvedValueOnce({ rows: [{ count: "2" }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});
    const token = jwt.sign({ id: "u1" }, process.env.AUTH_SECRET || "secret");
    await request(app)
      .post("/api/create-order")
      .set("authorization", `Bearer ${token}`)
      .send({ jobId: "1", price: 100, qty: 1, productType: "single" });
    const createCall = stripeMock.checkout.sessions.create.mock.calls.pop()[0];
    expect(createCall.line_items[0].price_data.unit_amount).toBe(100);
    const incentive = db.query.mock.calls.find(
      (c) =>
        c[0].includes("INSERT INTO incentives") && c[1][1] === "first_order",
    );
    expect(incentive).toBeUndefined();
    const orderInsert = db.query.mock.calls.find((c) =>
      c[0].includes("INSERT INTO orders"),
    );
    expect(orderInsert[1][3]).toBe(100);
    expect(orderInsert[1][7]).toBe(0);
  });
});
