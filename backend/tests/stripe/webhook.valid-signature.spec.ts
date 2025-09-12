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
const db = require("../../src/db");
const { enqueuePrint } = require("../../src/queue/printQueue.js");
const {
  enqueuePrint: enqueueDbPrint,
} = require("../../src/queue/dbPrintQueue.js");

const app = express();
app.use(router);

describe("webhook valid signature", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("valid checkout.session.completed returns 200", async () => {
    const payload = JSON.stringify({
      id: "evt_1",
      type: "checkout.session.completed",
      data: { object: { id: "sess_1", metadata: { jobId: "job1" } } },
    });
    const { header } = sign(payload, process.env.STRIPE_WEBHOOK_SECRET!);
    const res = await request(app)
      .post("/api/webhook/stripe")
      .set("stripe-signature", header)
      .set("Content-Type", "application/json")
      .send(payload);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
  });

  test("handler updates order and enqueues print", async () => {
    const payload = JSON.stringify({
      id: "evt_2",
      type: "checkout.session.completed",
      data: { object: { id: "sess_2", metadata: { jobId: "job2" } } },
    });
    const { header } = sign(payload, process.env.STRIPE_WEBHOOK_SECRET!);
    await request(app)
      .post("/api/webhook/stripe")
      .set("stripe-signature", header)
      .set("Content-Type", "application/json")
      .send(payload);
    expect(db.query).toHaveBeenCalledWith(
      "UPDATE orders SET status=$1 WHERE session_id=$2",
      ["paid", "sess_2"],
    );
    expect(enqueueDbPrint).toHaveBeenCalledWith(
      "job2",
      "sess_2",
      {},
      null,
      null,
    );
    expect(enqueuePrint).toHaveBeenCalledWith("job2");
  });
});
