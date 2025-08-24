import request from "supertest";
import express from "express";
import router, { orders } from "../../src/routes/checkout";
import { sign } from "./helpers/stripe-signing";

let currentEvent: any;
jest.mock("../../mail.js", () => ({ sendMail: jest.fn() }));
const mockMail = require("../../mail.js").sendMail as jest.Mock;
mockMail.mockImplementation(async () => {
  console.log(currentEvent.id, currentEvent.type);
});

const app = express();
app.use(router);

describe("webhook logging", () => {
  beforeEach(() => {
    orders.clear();
    mockMail.mockClear();
    process.env.STRIPE_SECRET_KEY = "sk_test_valid";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  });

  test("logs include event id and type", async () => {
    currentEvent = {
      id: "evt1",
      type: "checkout.session.completed",
      data: { object: { id: "sess1" } },
    };
    orders.set("sess1", { slug: "a", email: "a@b.com", paid: false });
    const payload = JSON.stringify(currentEvent);
    const { header } = sign(payload, process.env.STRIPE_WEBHOOK_SECRET!);
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    await request(app)
      .post("/api/stripe/webhook")
      .set("stripe-signature", header)
      .set("Content-Type", "application/json")
      .send(payload);
    expect(logSpy).toHaveBeenCalledWith("evt1", "checkout.session.completed");
    logSpy.mockRestore();
  });
});
