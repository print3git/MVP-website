import request from "supertest";
import express from "express";

const mockCreate = jest.fn();
const mockStripe = jest.fn().mockImplementation(() => ({
  checkout: { sessions: { create: mockCreate } },
}));
jest.mock("stripe", () => mockStripe);
jest.mock("../../src/db.js", () => ({ query: jest.fn().mockResolvedValue({ rows: [] }) }), { virtual: true });

const buildApp = () => {
  const router = require("../../src/routes/stripe/create-checkout-session").default;
  const app = express();
  app.use(express.json());
  app.use(router);
  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error(err);
    res.status(500).json({ error: err.message });
  });
  return app;
};

describe("create checkout session errors", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    process.env.FRONTEND_SUCCESS_URL = "https://example.com/success";
    process.env.FRONTEND_CANCEL_URL = "https://example.com/cancel";
  });

  test("missing STRIPE_SECRET_KEY returns 500", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_KEY;
    mockCreate.mockImplementation(() => {
      throw new Error("STRIPE_SECRET_KEY missing");
    });
    const app = buildApp();
    const res = await request(app)
      .post("/api/create-checkout-session")
      .send({ price: 100 });
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/STRIPE_SECRET_KEY missing/);
  });

  test("Stripe SDK throws surfaces 500 and log", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test";
    process.env.STRIPE_KEY = "sk_test";
    const error = new Error("boom");
    mockCreate.mockImplementation(() => {
      throw error;
    });
    const app = buildApp();
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const res = await request(app)
      .post("/api/create-checkout-session")
      .send({ price: 100 });
    expect(res.status).toBe(500);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
