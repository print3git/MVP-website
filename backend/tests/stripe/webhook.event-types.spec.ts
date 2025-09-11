import request from "supertest";
import express from "express";
import { sign } from "./helpers/stripe-signing";

jest.mock("../../src/db", () => ({ query: jest.fn() }));
jest.mock("../../src/queue/printQueue.js", () => ({ enqueuePrint: jest.fn() }));
jest.mock("../../src/queue/dbPrintQueue.js", () => ({
  enqueuePrint: jest.fn(),
}));

process.env.STRIPE_KEY = "sk_test_valid";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";

const router = require("../../src/routes/stripe/webhook").default;
const db = require("../../src/db");
const { enqueuePrint } = require("../../src/queue/printQueue.js");
const {
  enqueuePrint: enqueueDbPrint,
} = require("../../src/queue/dbPrintQueue.js");

const app = express();
app.use(router);

describe("webhook event types", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("unhandled event acknowledged without side effects", async () => {
    const payload = JSON.stringify({
      id: "evt1",
      type: "customer.created",
      data: { object: { id: "cust" } },
    });
    const { header } = sign(payload, process.env.STRIPE_WEBHOOK_SECRET!);
    const res = await request(app)
      .post("/api/webhook/stripe")
      .set("stripe-signature", header)
      .set("Content-Type", "application/json")
      .send(payload);
    expect(res.status).toBe(200);
    expect(db.query).not.toHaveBeenCalled();
    expect(enqueueDbPrint).not.toHaveBeenCalled();
    expect(enqueuePrint).not.toHaveBeenCalled();
  });

  test("checkout.session.completed with valid signature updates db and queues", async () => {
    const payload = JSON.stringify({
      id: "evt2",
      type: "checkout.session.completed",
      data: { object: { id: "sess1", metadata: { jobId: "job1" } } },
    });
    const { header } = sign(payload, process.env.STRIPE_WEBHOOK_SECRET!);
    const res = await request(app)
      .post("/api/webhook/stripe")
      .set("stripe-signature", header)
      .set("Content-Type", "application/json")
      .send(payload);
    expect(res.status).toBe(200);
    expect(db.query).toHaveBeenCalledWith(
      "UPDATE orders SET status=$1 WHERE session_id=$2",
      ["paid", "sess1"],
    );
    expect(enqueueDbPrint).toHaveBeenCalledWith(
      "job1",
      "sess1",
      {},
      null,
      null,
    );
    expect(enqueuePrint).toHaveBeenCalledWith("job1");
  });

  test("malformed payload with matching signature returns 400", async () => {
    const payload = '{"id":"evt3"';
    const { header } = sign(payload, process.env.STRIPE_WEBHOOK_SECRET!);
    const res = await request(app)
      .post("/api/webhook/stripe")
      .set("stripe-signature", header)
      .set("Content-Type", "application/json")
      .send(payload);
    expect(res.status).toBe(400);
  });
});
