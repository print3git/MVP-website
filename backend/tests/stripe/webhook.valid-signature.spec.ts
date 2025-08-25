import request from "supertest";
import express from "express";
import router, { orders } from "../../src/routes/checkout";
import { sign } from "./helpers/stripe-signing";

jest.mock("../../mail.js", () => ({
  sendMail: jest.fn().mockResolvedValue(undefined),
}));

const app = express();
app.use(router);

describe("webhook valid signature", () => {
  beforeEach(() => {
    orders.clear();
    process.env.STRIPE_SECRET_KEY = "sk_test_valid";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  });

  test("valid checkout.session.completed returns 200", async () => {
    orders.set("sess_1", { slug: "x", email: "a@b.com", paid: false });
    const payload = JSON.stringify({
      id: "evt_1",
      type: "checkout.session.completed",
      data: { object: { id: "sess_1" } },
    });
    const { header } = sign(payload, process.env.STRIPE_WEBHOOK_SECRET!);
    const res = await request(app)
      .post("/stripe/webhook")
      .set("stripe-signature", header)
      .set("Content-Type", "application/json")
      .send(payload);
    expect(res.status).toBe(200);
    expect(res.text).toBe("OK");
  });

  test("handler extracts session id", async () => {
    orders.set("sess_2", { slug: "y", email: "c@d.com", paid: false });
    const payload = JSON.stringify({
      id: "evt_2",
      type: "checkout.session.completed",
      data: { object: { id: "sess_2" } },
    });
    const { header } = sign(payload, process.env.STRIPE_WEBHOOK_SECRET!);
    await request(app)
      .post("/stripe/webhook")
      .set("stripe-signature", header)
      .set("Content-Type", "application/json")
      .send(payload);
    expect(orders.get("sess_2")?.paid).toBe(true);
  });
});
