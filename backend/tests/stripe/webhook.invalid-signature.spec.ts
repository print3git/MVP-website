import request from "supertest";
import express from "express";
import { sign } from "./helpers/stripe-signing";

jest.mock("../../src/db", () => ({ query: jest.fn() }));
jest.mock("../../src/queue/printQueue", () => ({ enqueuePrint: jest.fn() }));
jest.mock("../../src/queue/dbPrintQueue", () => ({ enqueuePrint: jest.fn() }));

process.env.STRIPE_KEY = "sk_test_valid";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";

const router = require("../../src/routes/stripe/webhook").default;
const db = require("../../src/db");
const { enqueuePrint } = require("../../src/queue/printQueue");
const {
  enqueuePrint: enqueueDbPrint,
} = require("../../src/queue/dbPrintQueue");

const app = express();
app.use(router);

describe("webhook invalid signature", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const payload = JSON.stringify({
    id: "evt_1",
    type: "checkout.session.completed",
    data: { object: { id: "sess_1" } },
  });

  test("missing signature header returns 400", async () => {
    const res = await request(app)
      .post("/api/webhook/stripe")
      .set("Content-Type", "application/json")
      .send(payload);
    expect(res.status).toBe(400);
    expect(db.query).not.toHaveBeenCalled();
    expect(enqueueDbPrint).not.toHaveBeenCalled();
    expect(enqueuePrint).not.toHaveBeenCalled();
  });

  test("wrong secret signature returns 400", async () => {
    const { header } = sign(payload, "wrong");
    const res = await request(app)
      .post("/api/webhook/stripe")
      .set("stripe-signature", header)
      .set("Content-Type", "application/json")
      .send(payload);
    expect(res.status).toBe(400);
    expect(db.query).not.toHaveBeenCalled();
    expect(enqueueDbPrint).not.toHaveBeenCalled();
    expect(enqueuePrint).not.toHaveBeenCalled();
  });
});
