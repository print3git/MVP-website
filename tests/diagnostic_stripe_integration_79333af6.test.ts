// Diagnostic checks for Stripe configuration and webhook handling
import request from "supertest";
import Stripe from "stripe";

process.env.DB_URL = process.env.DB_URL || "postgres://localhost/test";

jest.mock("../backend/db", () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
}));
const db = require("../backend/db");

describe("diagnostic stripe integration", () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  test("STRIPE_SECRET_KEY starts with 'sk_' and is not a placeholder", () => {
    if (!secretKey) {
      throw new Error(
        "Missing STRIPE_SECRET_KEY – did you forget to set it in your secrets?",
      );
    }
    expect(secretKey.startsWith("sk_")).toBe(true);
    expect(/sk_(test|live)_?(placeholder|dummy|key)?$/i.test(secretKey)).toBe(
      false,
    );
  });

  test("STRIPE_WEBHOOK_SECRET starts with 'whsec_' and is not a placeholder", () => {
    if (!webhookSecret) {
      throw new Error(
        "Missing STRIPE_WEBHOOK_SECRET – did you forget to set it in your secrets?",
      );
    }
    expect(webhookSecret.startsWith("whsec_")).toBe(true);
    expect(/whsec_(placeholder|dummy|key)?$/i.test(webhookSecret)).toBe(false);
  });

  const envValid =
    secretKey &&
    webhookSecret &&
    secretKey.startsWith("sk_") &&
    webhookSecret.startsWith("whsec_") &&
    !/placeholder|dummy/i.test(secretKey) &&
    !/placeholder|dummy/i.test(webhookSecret);

  (envValid ? describe : describe.skip)("webhook endpoint", () => {
    const app = require("../backend/server");
    const stripe = new Stripe("sk_test_dummy", {
      apiVersion: "2023-10-16",
    });

    test("accepts signed checkout.session.completed payload", async () => {
      const payload = {
        id: "evt_test_123",
        object: "event",
        type: "checkout.session.completed",
        data: { object: { id: "cs_test_123", metadata: {} } },
      };
      const body = JSON.stringify(payload);
      const signature = stripe.webhooks.generateTestHeaderString({
        payload: body,
        secret: webhookSecret!,
      });

      const res = await request(app)
        .post("/api/webhook/stripe")
        .set("stripe-signature", signature)
        .set("Content-Type", "application/json")
        .send(body);

      expect(res.status).toBe(200);
      expect(db.query).toHaveBeenCalledWith(
        "UPDATE orders SET status=$1 WHERE session_id=$2",
        ["paid", "cs_test_123"],
      );
    });
  });
});
