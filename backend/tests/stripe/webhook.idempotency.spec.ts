process.env.STRIPE_KEY = "sk_test_valid";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";

jest.mock("../../src/db", () => ({ query: jest.fn() }));
jest.mock("../../src/queue/dbPrintQueue", () => ({ enqueuePrint: jest.fn() }));
jest.mock("../../src/queue/printQueue", () => ({ enqueuePrint: jest.fn() }));
jest.mock("../../src/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

import request from "supertest";
import express from "express";
import router from "../../src/routes/stripe/webhook";
import { sign } from "./helpers/stripe-signing";

const db = require("../../src/db");
const { enqueuePrint: enqueueDbPrint } = require("../../src/queue/dbPrintQueue");
const { enqueuePrint } = require("../../src/queue/printQueue");
const logger = require("../../src/logger");

const app = express();
app.use(router);

describe("webhook idempotency", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const makePayload = (id: string, session: string) =>
    JSON.stringify({
      id,
      type: "checkout.session.completed",
      data: {
        object: { id: session, metadata: { jobId: `job-${session}` } },
      },
    });

  test("same event delivered twice processed once", async () => {
    const payload = makePayload("evt1", "sess1");
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
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(enqueueDbPrint).toHaveBeenCalledTimes(1);
    expect(enqueuePrint).toHaveBeenCalledTimes(1);
    const orderPaidLogs = logger.info.mock.calls.filter(
      ([msg]: any[]) => msg === "order_paid",
    );
    expect(orderPaidLogs.length).toBe(1);
  });

  test("out-of-order duplicate ignored", async () => {
    const payload1 = makePayload("evt2", "sess2");
    const { header: h1 } = sign(payload1, process.env.STRIPE_WEBHOOK_SECRET!);
    await request(app)
      .post("/api/webhook/stripe")
      .set("stripe-signature", h1)
      .set("Content-Type", "application/json")
      .send(payload1);
    const payload2 = makePayload("evt1", "sess2");
    const { header: h2 } = sign(payload2, process.env.STRIPE_WEBHOOK_SECRET!);
    await request(app)
      .post("/api/webhook/stripe")
      .set("stripe-signature", h2)
      .set("Content-Type", "application/json")
      .send(payload2);
    expect(db.query).toHaveBeenCalledTimes(1);
    const orderPaidLogs = logger.info.mock.calls.filter(
      ([msg]: any[]) => msg === "order_paid",
    );
    expect(orderPaidLogs.length).toBe(1);
  });

  test("different events processed each once", async () => {
    const p1 = makePayload("evt3", "sess3");
    const p2 = makePayload("evt4", "sess4");
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
    expect(db.query).toHaveBeenCalledTimes(2);
    const orderPaidLogs = logger.info.mock.calls.filter(
      ([msg]: any[]) => msg === "order_paid",
    );
    expect(orderPaidLogs.length).toBe(2);
  });
});

