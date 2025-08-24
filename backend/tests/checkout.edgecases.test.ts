const request = require("supertest");
const Stripe = require("stripe");

process.env.STRIPE_TEST_KEY = "sk_test";
process.env.STRIPE_LIVE_KEY = "sk_live";
process.env.STRIPE_WEBHOOK_SECRET = "whsec";

jest.mock("stripe");
const stripeMock = {
  checkout: {
    sessions: {
      create: jest.fn(),
    },
  },
};
Stripe.mockImplementation(() => stripeMock);

const app = require("../src/app");
const { orders } = require("../src/routes/checkout");

afterEach(() => {
  orders.clear();
  jest.clearAllMocks();
});

describe("checkout edge cases", () => {
  test("missing email returns 400", async () => {
    const res = await request(app).post("/api/checkout").send({ slug: "m1" });
    expect(res.status).toBe(400);
    expect(orders.size).toBe(0);
  });

  test("missing slug returns 400", async () => {
    const res = await request(app)
      .post("/api/checkout")
      .send({ email: "a@a.com" });
    expect(res.status).toBe(400);
    expect(orders.size).toBe(0);
  });

  test("stripe rejects invalid payment method", async () => {
    stripeMock.checkout.sessions.create.mockRejectedValueOnce(
      new Error("invalid"),
    );
    const res = await request(app)
      .post("/api/checkout")
      .send({ slug: "m1", email: "a@a.com" });
    expect(res.status).toBe(500);
  });

  test("network timeout handled with 500", async () => {
    stripeMock.checkout.sessions.create.mockRejectedValueOnce(
      new Error("timeout"),
    );
    const res = await request(app)
      .post("/api/checkout")
      .send({ slug: "m1", email: "a@a.com" });
    expect(res.status).toBe(500);
  });

  test("successful checkout stores order and returns url", async () => {
    stripeMock.checkout.sessions.create.mockResolvedValueOnce({
      id: "cs_ok",
      url: "http://ok",
    });
    const setSpy = jest.spyOn(orders, "set");
    const res = await request(app)
      .post("/api/checkout")
      .send({ slug: "m1", email: "a@a.com" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ checkoutUrl: "http://ok" });
    expect(setSpy).toHaveBeenCalledWith("cs_ok", {
      slug: "m1",
      email: "a@a.com",
      paid: false,
    });
  });
});
