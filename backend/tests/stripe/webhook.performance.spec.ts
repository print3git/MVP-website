import request from "supertest";
import express from "express";
import { sign } from "./helpers/stripe-signing";

jest.mock("../../src/db", () => ({ query: jest.fn() }));
jest.mock("../../src/queue/printQueue.js", () => ({ enqueuePrint: jest.fn() }));
jest.mock("../../src/queue/dbPrintQueue.js", () => ({
  enqueuePrint: jest.fn(),
}));

process.env.STRIPE_SECRET_KEY = "sk_test_valid";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";

const router = require("../../src/routes/stripe/webhook").default;

const app = express();
app.use(router);

describe("webhook performance", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("valid event completes under budget", async () => {
    const budget = Number(process.env.STRIPE_TEST_BUDGET_MS || "500");
    const payload = JSON.stringify({
      id: "evt1",
      type: "checkout.session.completed",
      data: { object: { id: "sess1", metadata: { jobId: "job1" } } },
    });
    const { header } = sign(payload, process.env.STRIPE_WEBHOOK_SECRET!);
    const start = Date.now();
    const res = await request(app)
      .post("/api/webhook/stripe")
      .set("stripe-signature", header)
      .set("Content-Type", "application/json")
      .send(payload);
    const duration = Date.now() - start;
    expect(res.status).toBe(200);
    expect(duration).toBeLessThan(budget);
  });
});
