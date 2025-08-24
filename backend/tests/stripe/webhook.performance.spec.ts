import request from "supertest";
import express from "express";
import router, { orders } from "../../src/routes/checkout";
import { sign } from "./helpers/stripe-signing";

jest.mock("../../mail.js", () => ({
  sendMail: jest.fn().mockResolvedValue(undefined),
}));

const app = express();
app.use(router);

describe("webhook performance", () => {
  beforeEach(() => {
    orders.clear();
    process.env.STRIPE_SECRET_KEY = "sk_test_valid";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  });

  test("valid event completes under budget", async () => {
    const budget = Number(process.env.STRIPE_TEST_BUDGET_MS || "500");
    orders.set("sess1", { slug: "a", email: "a@b.com", paid: false });
    const payload = JSON.stringify({
      id: "evt1",
      type: "checkout.session.completed",
      data: { object: { id: "sess1" } },
    });
    const { header } = sign(payload, process.env.STRIPE_WEBHOOK_SECRET!);
    const start = Date.now();
    const res = await request(app)
      .post("/api/stripe/webhook")
      .set("stripe-signature", header)
      .set("Content-Type", "application/json")
      .send(payload);
    const duration = Date.now() - start;
    expect(res.status).toBe(200);
    expect(duration).toBeLessThan(budget);
  });
});
