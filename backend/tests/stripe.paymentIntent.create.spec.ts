process.env.STRIPE_SECRET_KEY = "sk_test";

jest.mock("../db", () => ({ query: jest.fn() }));
const db = require("../db");

jest.mock("stripe");
const Stripe = require("stripe");
const stripeMock = {
  paymentIntents: {
    create: jest.fn().mockResolvedValue({ client_secret: "pi_secret_123" }),
  },
};
Stripe.mockImplementation(() => stripeMock);

const request = require("supertest");
const app = require("../src/app");

describe("POST /api/checkout/create", () => {
  test("creates payment intent and returns client secret", async () => {
    const res = await request(app)
      .post("/api/checkout/create")
      .send({
        items: [
          { price: "print_multi", quantity: 1 },
          { price: "print_single", quantity: 2 },
        ],
        currency: "usd",
      });

    expect(res.status).toBe(200);
    expect(res.body.clientSecret).toBe("pi_secret_123");
    expect(stripeMock.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 3999 + 2 * 2999,
        currency: "usd",
        automatic_payment_methods: { enabled: true },
      }),
    );
    expect(db.query).not.toHaveBeenCalled();
  });
});
