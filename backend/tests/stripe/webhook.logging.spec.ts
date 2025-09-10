import request from "supertest";
import express from "express";
import { sign } from "./helpers/stripe-signing";

jest.mock("../../src/db", () => ({ query: jest.fn() }));
jest.mock("../../src/queue/printQueue", () => ({ enqueuePrint: jest.fn() }));
jest.mock("../../src/queue/dbPrintQueue", () => ({ enqueuePrint: jest.fn() }));
jest.mock("../../src/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

process.env.STRIPE_KEY = "sk_test_valid";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";

const router = require("../../src/routes/stripe/webhook").default;
const logger = require("../../src/logger");

const app = express();
app.use(router);

describe("webhook logging", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("logs include event type and session id", async () => {
    const payload = JSON.stringify({
      id: "evt1",
      type: "checkout.session.completed",
      data: { object: { id: "sess1", metadata: { jobId: "job1" } } },
    });
    const { header } = sign(payload, process.env.STRIPE_WEBHOOK_SECRET!);
    await request(app)
      .post("/api/webhook/stripe")
      .set("stripe-signature", header)
      .set("Content-Type", "application/json")
      .send(payload);
    expect(logger.info).toHaveBeenCalledWith("stripe_webhook_received", {
      type: "checkout.session.completed",
    });
    expect(logger.info).toHaveBeenCalledWith("order_paid", {
      sessionId: "sess1",
    });
  });
});
