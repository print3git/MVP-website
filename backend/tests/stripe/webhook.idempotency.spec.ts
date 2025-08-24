import request from "supertest";
import express from "express";
import router, { orders } from "../../src/routes/checkout";
import { sign } from "./helpers/stripe-signing";

jest.mock("../../mail.js", () => ({ sendMail: jest.fn() }));
const mockMail = require("../../mail.js").sendMail as jest.Mock;

const app = express();
app.use(router);

describe("webhook idempotency", () => {
  beforeEach(() => {
    orders.clear();
    mockMail.mockClear();
    process.env.STRIPE_SECRET_KEY = "sk_test_valid";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  });

  const makePayload = (id: string, session: string) =>
    JSON.stringify({
      id,
      type: "checkout.session.completed",
      data: { object: { id: session } },
    });

  test("same event delivered twice processed once", async () => {
    orders.set("sess1", { slug: "a", email: "a@b.com", paid: false });
    const payload = makePayload("evt1", "sess1");
    const { header } = sign(payload, process.env.STRIPE_WEBHOOK_SECRET!);
    await request(app)
      .post("/api/stripe/webhook")
      .set("stripe-signature", header)
      .set("Content-Type", "application/json")
      .send(payload);
    await request(app)
      .post("/api/stripe/webhook")
      .set("stripe-signature", header)
      .set("Content-Type", "application/json")
      .send(payload);
    expect(mockMail.mock.calls.length).toBe(1);
  });

  test("out-of-order duplicate ignored", async () => {
    orders.set("sess2", { slug: "b", email: "b@c.com", paid: false });
    const payload1 = makePayload("evt2", "sess2");
    const { header: h1 } = sign(payload1, process.env.STRIPE_WEBHOOK_SECRET!);
    await request(app)
      .post("/api/stripe/webhook")
      .set("stripe-signature", h1)
      .set("Content-Type", "application/json")
      .send(payload1);
    const payload2 = makePayload("evt1", "sess2");
    const { header: h2 } = sign(payload2, process.env.STRIPE_WEBHOOK_SECRET!);
    await request(app)
      .post("/api/stripe/webhook")
      .set("stripe-signature", h2)
      .set("Content-Type", "application/json")
      .send(payload2);
    expect(mockMail.mock.calls.length).toBe(1);
  });

  test("different events processed each once", async () => {
    orders.set("sess3", { slug: "c", email: "c@d.com", paid: false });
    orders.set("sess4", { slug: "d", email: "d@e.com", paid: false });
    const p1 = makePayload("evt3", "sess3");
    const p2 = makePayload("evt4", "sess4");
    const { header: h1 } = sign(p1, process.env.STRIPE_WEBHOOK_SECRET!);
    const { header: h2 } = sign(p2, process.env.STRIPE_WEBHOOK_SECRET!);
    await request(app)
      .post("/api/stripe/webhook")
      .set("stripe-signature", h1)
      .set("Content-Type", "application/json")
      .send(p1);
    await request(app)
      .post("/api/stripe/webhook")
      .set("stripe-signature", h2)
      .set("Content-Type", "application/json")
      .send(p2);
    expect(mockMail.mock.calls.length).toBe(2);
  });
});
