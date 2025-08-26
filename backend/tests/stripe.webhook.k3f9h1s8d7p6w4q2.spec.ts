import request from "supertest";
process.env.STRIPE_SECRET_KEY = "sk_test";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";

jest.mock("stripe");
const Stripe = require("stripe");
const stripeMock = { webhooks: { constructEvent: jest.fn() } };
(Stripe as jest.Mock).mockImplementation(() => stripeMock);
const upsertOrderPaid = jest.fn();
const markPaymentProcessed = jest.fn();
jest.mock("../src/db", () => ({
  upsertOrderPaid,
  markPaymentProcessed,
}));

const app = require("../src/app");

describe("stripe webhook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("happy path persists order", async () => {
    const event: Stripe.Event = {
      id: "evt_1",
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_1",
          amount: 5000,
          currency: "usd",
          status: "succeeded",
          metadata: {
            userId: "u1",
            orderId: "o1",
            qty: "2",
            modelUrl: "https://files/model.glb",
          },
          charges: { data: [{ receipt_email: "e@example.com" }] },
        },
      },
      object: "event",
      api_version: null,
      created: 0,
      livemode: false,
      pending_webhooks: 0,
      request: { id: null, idempotency_key: null },
    } as any;
    (markPaymentProcessed as jest.Mock).mockResolvedValueOnce(true);
    stripeMock.webhooks.constructEvent.mockReturnValueOnce(event);

    const res = await request(app)
      .post("/api/stripe/webhook")
      .set("stripe-signature", "sig")
      .send("{}")
      .expect(200);
    expect(res.body).toEqual({ ok: true });
    expect(markPaymentProcessed).toHaveBeenCalledWith("pi_1");
    expect(upsertOrderPaid).toHaveBeenCalledWith({
      userId: "u1",
      orderId: "o1",
      intentId: "pi_1",
      amountCents: 5000,
      currency: "usd",
      email: "e@example.com",
      quantity: 2,
      modelUrl: "https://files/model.glb",
    });
  });

  test("bad signature returns 400", async () => {
    stripeMock.webhooks.constructEvent.mockImplementationOnce(() => {
      throw new Error("bad sig");
    });
    const res = await request(app)
      .post("/api/stripe/webhook")
      .set("stripe-signature", "sig")
      .send("{}")
      .expect(400);
    expect(res.body).toEqual({ error: "invalid_signature" });
  });

  test("idempotency skips second write", async () => {
    const event: Stripe.Event = {
      id: "evt_2",
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_2", amount: 100, currency: "usd", status: "succeeded", metadata: {}, charges: { data: [{}] } } },
      object: "event",
      api_version: null,
      created: 0,
      livemode: false,
      pending_webhooks: 0,
      request: { id: null, idempotency_key: null },
    } as any;
    stripeMock.webhooks.constructEvent.mockReturnValue(event);
    (markPaymentProcessed as jest.Mock)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    await request(app)
      .post("/api/stripe/webhook")
      .set("stripe-signature", "sig")
      .send("{}")
      .expect(200);
    await request(app)
      .post("/api/stripe/webhook")
      .set("stripe-signature", "sig")
      .send("{}")
      .expect(200);
    expect(upsertOrderPaid).toHaveBeenCalledTimes(1);
  });
});
