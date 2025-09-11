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
const db = require("../../src/db");

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
    const sql = "UPDATE orders SET status=$1 WHERE session_id=$2";
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(db.query).toHaveBeenCalledWith(sql, ["paid", "sess1"]);
    expect(logger.info).toHaveBeenCalledWith("stripe_webhook_received", {
      type: "checkout.session.completed",
    });
    const orderPaidCalls = logger.info.mock.calls.filter(
      (c) => c[0] === "order_paid",
    );
    expect(orderPaidCalls).toHaveLength(1);
    expect(orderPaidCalls[0][1]).toEqual({ sessionId: "sess1" });
  });
});
