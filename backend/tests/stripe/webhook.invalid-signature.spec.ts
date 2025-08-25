import request from "supertest";
import express from "express";
import router, { orders } from "../../src/routes/checkout";
import { sign } from "./helpers/stripe-signing";

jest.mock("../../mail.js", () => ({
  sendMail: jest.fn(),
}));

const app = express();
app.use(router);

describe("webhook invalid signature", () => {
  beforeEach(() => {
    orders.clear();
    process.env.STRIPE_SECRET_KEY = "sk_test_valid";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  });

  const payload = JSON.stringify({
    id: "evt_1",
    type: "checkout.session.completed",
    data: { object: { id: "sess_1" } },
  });

  test("missing signature header returns 500", async () => {
    const res = await request(app)
      .post("/stripe/webhook")
      .set("Content-Type", "application/json")
      .send(payload);
    expect(res.status).toBe(500);
  });

  test("wrong secret signature returns 500", async () => {
    const { header } = sign(payload, "wrong");
    const res = await request(app)
      .post("/stripe/webhook")
      .set("stripe-signature", header)
      .set("Content-Type", "application/json")
      .send(payload);
    expect(res.status).toBe(500);
  });
});
