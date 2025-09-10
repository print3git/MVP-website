import request from "supertest";
import app from "../../src/app";
import Stripe from "stripe";
import db from "../../db";

describe("POST /api/checkout/create", () => {
  const body = { items: [{ price: "price_123", quantity: 1 }] };

  beforeEach(() => {
    process.env.FRONTEND_SUCCESS_URL = "https://success";
    process.env.FRONTEND_CANCEL_URL = "https://cancel";
    process.env.STRIPE_SECRET_KEY = "sk_test_X";
    (Stripe as any).__mocks.createMock.mockClear();
    (db.query as jest.Mock).mockClear();
  });

  test("returns 200 with session id on happy path", async () => {
    const res = await request(app).post("/api/checkout/create").send(body);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: "cs_test_123" });
    const args = (Stripe as any).__mocks.createMock.mock.calls[0][0];
    expect(args.currency).toBe("usd");
  });

  test("uses env FRONTEND_SUCCESS_URL and FRONTEND_CANCEL_URL in Stripe args", async () => {
    await request(app).post("/api/checkout/create").send(body);
    const args = (Stripe as any).__mocks.createMock.mock.calls[0][0];
    expect(args.success_url).toBe(process.env.FRONTEND_SUCCESS_URL);
    expect(args.cancel_url).toBe(process.env.FRONTEND_CANCEL_URL);
  });

  test("forwards allow_promotion_codes = true when requested", async () => {
    await request(app)
      .post("/api/checkout/create")
      .send({ ...body, allowPromotionCodes: true });
    const args = (Stripe as any).__mocks.createMock.mock.calls[0][0];
    expect(args.allow_promotion_codes).toBe(true);
  });

  test("validates quantity >= 1 — returns 400 when 0", async () => {
    const res = await request(app)
      .post("/api/checkout/create")
      .send({ items: [{ price: "price_123", quantity: 0 }] });
    expect(res.status).toBe(400);
  });

  test("validates quantity <= 99 — returns 400 when 100", async () => {
    const res = await request(app)
      .post("/api/checkout/create")
      .send({ items: [{ price: "price_123", quantity: 100 }] });
    expect(res.status).toBe(400);
  });

  test("rejects empty items array — returns 400", async () => {
    const res = await request(app)
      .post("/api/checkout/create")
      .send({ items: [] });
    expect(res.status).toBe(400);
  });

  test("rejects item missing price — returns 400", async () => {
    const res = await request(app)
      .post("/api/checkout/create")
      .send({ items: [{ quantity: 1 }] });
    expect(res.status).toBe(400);
  });

  test("supports metadata passthrough — sends metadata from body to Stripe", async () => {
    await request(app)
      .post("/api/checkout/create")
      .send({ ...body, metadata: { order: "1" } });
    const args = (Stripe as any).__mocks.createMock.mock.calls[0][0];
    expect(args.metadata).toEqual({ order: "1" });
  });

  test("sends customer_email when present in body", async () => {
    await request(app)
      .post("/api/checkout/create")
      .send({ ...body, customer_email: "a@b.com" });
    const args = (Stripe as any).__mocks.createMock.mock.calls[0][0];
    expect(args.customer_email).toBe("a@b.com");
  });

  test("sets mode='payment' and payment_method_types includes 'card'", async () => {
    await request(app).post("/api/checkout/create").send(body);
    const args = (Stripe as any).__mocks.createMock.mock.calls[0][0];
    expect(args.mode).toBe("payment");
    expect(args.payment_method_types).toContain("card");
  });

  test("enables shipping_address_collection when body.requiresShipping=true", async () => {
    await request(app)
      .post("/api/checkout/create")
      .send({ ...body, requiresShipping: true });
    const args = (Stripe as any).__mocks.createMock.mock.calls[0][0];
    expect(args.shipping_address_collection).toBeDefined();
  });

  test("sets currency from body.currency", async () => {
    await request(app)
      .post("/api/checkout/create")
      .send({ ...body, currency: "eur" });
    const args = (Stripe as any).__mocks.createMock.mock.calls[0][0];
    expect(args.currency).toBe("eur");
  });

  test("passes an idempotency key header if body.idempotencyKey provided", async () => {
    await request(app)
      .post("/api/checkout/create")
      .send({ ...body, idempotencyKey: "abc" });
    const opts = (Stripe as any).__mocks.createMock.mock.calls[0][1];
    expect(opts.idempotencyKey).toBe("abc");
  });

  test("maps Stripe create failure to 502 with {error:'stripe_error'}", async () => {
    (Stripe as any).__mocks.createMock.mockRejectedValueOnce(new Error("boom"));
    const res = await request(app).post("/api/checkout/create").send(body);
    expect(res.status).toBe(502);
    expect(res.body).toEqual({ error: "stripe_error" });
  });

  test("maps programmer/validation error to 400 with {error:'bad_request'}", async () => {
    const res = await request(app).post("/api/checkout/create").send({});
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "bad_request" });
  });

  test("ensures the route does NOT read from DB (db mock not called)", async () => {
    await request(app).post("/api/checkout/create").send(body);
    expect(db.query).not.toHaveBeenCalled();
  });
});

