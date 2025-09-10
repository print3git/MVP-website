process.env.STRIPE_KEY = "sk_test_valid";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";

let currentEvent: any;

jest.mock("../../src/db", () => ({ query: jest.fn() }));
jest.mock("../../src/queue/dbPrintQueue", () => ({
  enqueuePrint: jest.fn(async () => {
    console.log(currentEvent.id, currentEvent.type);
  }),
}));
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

const app = express();
app.use(router);

describe("webhook logging", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("logs include event id and type", async () => {
    currentEvent = {
      id: "evt1",
      type: "checkout.session.completed",
      data: { object: { id: "sess1", metadata: { jobId: "job-sess1" } } },
    };
    const payload = JSON.stringify(currentEvent);
    const { header } = sign(payload, process.env.STRIPE_WEBHOOK_SECRET!);
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    await request(app)
      .post("/api/webhook/stripe")
      .set("stripe-signature", header)
      .set("Content-Type", "application/json")
      .send(payload);
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith("evt1", "checkout.session.completed");
    logSpy.mockRestore();
  });
});

