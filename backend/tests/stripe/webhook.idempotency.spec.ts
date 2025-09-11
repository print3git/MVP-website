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
const db = require("../../src/db");
const { enqueuePrint } = require("../../src/queue/printQueue");
const {
  enqueuePrint: enqueueDbPrint,
} = require("../../src/queue/dbPrintQueue");
const logger = require("../../src/logger");

const app = express();
app.use(router);

describe("webhook idempotency", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const makePayload = (id: string, session: string, job = "job") =>
    JSON.stringify({
      id,
      type: "checkout.session.completed",
      data: { object: { id: session, metadata: { jobId: job } } },
    });

  test("same event delivered twice processed once", async () => {
    const payload = makePayload("evt1", "sess1", "job1");
    const { header } = sign(payload, process.env.STRIPE_WEBHOOK_SECRET!);
    await request(app)
      .post("/api/webhook/stripe")
      .set("stripe-signature", header)
      .set("Content-Type", "application/json")
      .send(payload);
    await request(app)
      .post("/api/webhook/stripe")
      .set("stripe-signature", header)
      .set("Content-Type", "application/json")
      .send(payload);
    const sql = "UPDATE orders SET status=$1 WHERE session_id=$2";
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(db.query).toHaveBeenCalledWith(sql, ["paid", "sess1"]);
    const orderPaidCalls = logger.info.mock.calls.filter(
      (c) => c[0] === "order_paid",
    );
    expect(orderPaidCalls).toHaveLength(1);
    expect(orderPaidCalls[0][1]).toEqual({ sessionId: "sess1" });
    expect(enqueueDbPrint).toHaveBeenCalledTimes(1);
    expect(enqueuePrint).toHaveBeenCalledTimes(1);
  });

  test("out-of-order duplicate ignored", async () => {
    const payload1 = makePayload("evt2", "sess2", "job2");
    const { header: h1 } = sign(payload1, process.env.STRIPE_WEBHOOK_SECRET!);
    await request(app)
      .post("/api/webhook/stripe")
      .set("stripe-signature", h1)
      .set("Content-Type", "application/json")
      .send(payload1);
    const payload2 = makePayload("evt1", "sess2", "job2");
    const { header: h2 } = sign(payload2, process.env.STRIPE_WEBHOOK_SECRET!);
    await request(app)
      .post("/api/webhook/stripe")
      .set("stripe-signature", h2)
      .set("Content-Type", "application/json")
      .send(payload2);
    const sql = "UPDATE orders SET status=$1 WHERE session_id=$2";
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(db.query).toHaveBeenCalledWith(sql, ["paid", "sess2"]);
    const orderPaidCalls = logger.info.mock.calls.filter(
      (c) => c[0] === "order_paid",
    );
    expect(orderPaidCalls).toHaveLength(1);
    expect(orderPaidCalls[0][1]).toEqual({ sessionId: "sess2" });
    expect(enqueueDbPrint).toHaveBeenCalledTimes(1);
    expect(enqueuePrint).toHaveBeenCalledTimes(1);
  });

  test("different events processed each once", async () => {
    const p1 = makePayload("evt3", "sess3", "job3");
    const p2 = makePayload("evt4", "sess4", "job4");
    const { header: h1 } = sign(p1, process.env.STRIPE_WEBHOOK_SECRET!);
    const { header: h2 } = sign(p2, process.env.STRIPE_WEBHOOK_SECRET!);
    await request(app)
      .post("/api/webhook/stripe")
      .set("stripe-signature", h1)
      .set("Content-Type", "application/json")
      .send(p1);
    await request(app)
      .post("/api/webhook/stripe")
      .set("stripe-signature", h2)
      .set("Content-Type", "application/json")
      .send(p2);
    const sql = "UPDATE orders SET status=$1 WHERE session_id=$2";
    expect(db.query).toHaveBeenCalledTimes(2);
    expect(db.query).toHaveBeenNthCalledWith(1, sql, ["paid", "sess3"]);
    expect(db.query).toHaveBeenNthCalledWith(2, sql, ["paid", "sess4"]);
    const orderPaidCalls = logger.info.mock.calls.filter(
      (c) => c[0] === "order_paid",
    );
    expect(orderPaidCalls).toHaveLength(2);
    expect(orderPaidCalls[0][1]).toEqual({ sessionId: "sess3" });
    expect(orderPaidCalls[1][1]).toEqual({ sessionId: "sess4" });
    expect(enqueueDbPrint).toHaveBeenCalledTimes(2);
    expect(enqueuePrint).toHaveBeenCalledTimes(2);
  });
});
