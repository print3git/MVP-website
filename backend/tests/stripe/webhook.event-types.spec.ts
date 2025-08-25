import request from "supertest";
import express from "express";
import router, { orders } from "../../src/routes/checkout";
import { sign } from "./helpers/stripe-signing";

jest.mock("../../mail.js", () => ({ sendMail: jest.fn() }));
const mockMail = require("../../mail.js").sendMail as jest.Mock;

const app = express();
app.use(router);

describe("webhook event types", () => {
  beforeEach(() => {
    orders.clear();
    mockMail.mockClear();
    process.env.STRIPE_SECRET_KEY = "sk_test_valid";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  });

  test("unhandled event acknowledged without side effects", async () => {
    const payload = JSON.stringify({
      id: "evt1",
      type: "customer.created",
      data: { object: { id: "cust" } },
    });
    const { header } = sign(payload, process.env.STRIPE_WEBHOOK_SECRET!);
    const res = await request(app)
      .post("/stripe/webhook")
      .set("stripe-signature", header)
      .set("Content-Type", "application/json")
      .send(payload);
    expect(res.status).toBe(200);
    expect(mockMail).not.toHaveBeenCalled();
  });

  test("payment_intent.succeeded with valid signature returns 200", async () => {
    const payload = JSON.stringify({
      id: "evt2",
      type: "payment_intent.succeeded",
      data: { object: { id: "pi" } },
    });
    const { header } = sign(payload, process.env.STRIPE_WEBHOOK_SECRET!);
    const res = await request(app)
      .post("/stripe/webhook")
      .set("stripe-signature", header)
      .set("Content-Type", "application/json")
      .send(payload);
    expect(res.status).toBe(200);
  });

  test("malformed payload with matching signature returns 500", async () => {
    const payload = '{"id":"evt3"';
    const { header } = sign(payload, process.env.STRIPE_WEBHOOK_SECRET!);
    const res = await request(app)
      .post("/stripe/webhook")
      .set("stripe-signature", header)
      .set("Content-Type", "application/json")
      .send(payload);
    expect(res.status).toBe(500);
  });
});
