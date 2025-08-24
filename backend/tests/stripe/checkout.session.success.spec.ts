import request from "supertest";
import express from "express";

const mockCreate = jest.fn().mockResolvedValue({ id: "sess_123", url: "https://pay" });
jest.mock("stripe", () => {
  return jest.fn().mockImplementation(() => ({
    checkout: { sessions: { create: mockCreate } },
  }));
});
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

describe("create checkout session success", () => {
  beforeEach(() => {
    mockCreate.mockClear();
    process.env.STRIPE_KEY = "sk_test";
    process.env.FRONTEND_SUCCESS_URL = "https://example.com/success";
    process.env.FRONTEND_CANCEL_URL = "https://example.com/cancel";
  });

  test("returns id and uses env URLs", async () => {
    const app = buildApp();
    const res = await request(app)
      .post("/api/create-checkout-session")
      .send({ price: 100 });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", "sess_123");
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url: process.env.FRONTEND_SUCCESS_URL,
        cancel_url: process.env.FRONTEND_CANCEL_URL,
      }),
    );
  });
});
