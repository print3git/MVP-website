process.env.STRIPE_SECRET_KEY = "sk_test";
process.env.FRONTEND_SUCCESS_URL = "http://example.com/success";
process.env.FRONTEND_CANCEL_URL = "http://example.com/cancel";

jest.mock("stripe");
const Stripe = require("stripe");
const stripeMock = {
  checkout: {
    sessions: {
      create: jest.fn().mockResolvedValue({ id: "cs_test" }),
    },
  },
};
Stripe.mockImplementation(() => stripeMock);

const request = require("supertest");
const app = require("../../src/app");

test("POST /create-checkout-session returns id", async () => {
  const res = await request(app).post("/create-checkout-session").send({});
  expect(res.status).toBe(200);
  expect(res.body.id).toBe("cs_test");
});
