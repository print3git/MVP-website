import express from "express";
import request from "supertest";

const mockStripeConstructEvent = jest.fn();
const mockStripeSessionCreate = jest.fn();

jest.mock("stripe", () => ({
  __esModule: true,
  default: jest.fn(() => ({
    webhooks: { constructEvent: mockStripeConstructEvent },
    checkout: { sessions: { create: mockStripeSessionCreate } },
  })),
}));

const mockPgQuery = jest.fn();
const mockPool = jest.fn(() => ({ query: mockPgQuery }));
jest.mock("pg", () => ({ Pool: mockPool }));

const mockSendMail = jest.fn().mockResolvedValue(undefined);
jest.mock("../mail.js", () => ({ sendMail: mockSendMail }));

let app: express.Express;
let orders: Map<string, any>;

beforeAll(async () => {
  process.env.STRIPE_TEST_KEY = "sk_test";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  process.env.FRONTEND_SUCCESS_URL = "https://example.com/success";
  process.env.FRONTEND_CANCEL_URL = "https://example.com/cancel";
  process.env.CLOUDFRONT_MODEL_DOMAIN = "cdn.example.com";
  ({ app } = await import("../src/app"));
  ({ orders } = await import("../src/routes/checkout"));
});

beforeEach(() => {
  mockPgQuery.mockReset();
  mockStripeConstructEvent.mockReset();
  mockStripeSessionCreate.mockReset();
  mockSendMail.mockClear();
  orders.clear();
});

const requestJson = (
  method: "get" | "post" | "options" | "put" | "patch" | "delete",
  url: string,
  body?: any,
) => {
  let req = (request(app) as any)
    [method](url)
    .set("Content-Type", "application/json");
  if (body !== undefined) {
    req = req.send(body);
  }
  return req;
};

describe("health router", () => {
  test("GET /healthz returns ok", async () => {
    const res = await request(app).get("/healthz");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test("POST /healthz with JSON returns 404", async () => {
    const res = await requestJson("post", "/healthz", { foo: "bar" });
    expect(res.status).toBe(404);
  });
});

describe("app middleware", () => {
  test("GET /unknown-path returns 404", async () => {
    const res = await request(app).get("/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toMatch(/json|text/);
  });

  test("invalid JSON payload results in 500", async () => {
    const res = await request(app)
      .post("/api/items")
      .set("Content-Type", "application/json")
      .send("{ invalid json");
    expect(res.status).toBe(500);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
  });

  test("global error handler returns 500", async () => {
    const router = express.Router();
    router.get("/boom", () => {
      throw new Error("boom");
    });
    app.use(router);
    const res = await request(app).get("/boom");
    expect(res.status).toBe(500);
    if (app._router) app._router.stack.pop();
  });
});

describe("items router", () => {
  test("OPTIONS /api/items indicates router mounted", async () => {
    const res = await request(app).options("/api/items");
    expect(res.status).toBe(200);
    expect(res.headers["allow"]).toContain("POST");
  });

  test("rejects wrong content-type", async () => {
    const res = await request(app)
      .post("/api/items")
      .set("Content-Type", "text/plain")
      .send('{"name":"a","priceCents":1}');
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  test("creates item and returns id", async () => {
    mockPgQuery.mockResolvedValueOnce({ rows: [{ id: "uuid-1" }] });
    const res = await requestJson("post", "/api/items", {
      name: "foo",
      priceCents: 100,
    });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe("uuid-1");
  });

  test("duplicate item name returns 409", async () => {
    mockPgQuery.mockRejectedValueOnce({ code: "23505" });
    const res = await requestJson("post", "/api/items", {
      name: "foo",
      priceCents: 100,
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already exists/);
  });

  test("unexpected db error returns 500", async () => {
    mockPgQuery.mockRejectedValueOnce(new Error("fail"));
    const res = await requestJson("post", "/api/items", {
      name: "foo",
      priceCents: 100,
    });
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Internal Server Error" });
  });

  test("validates image URLs", async () => {
    const res = await requestJson("post", "/api/items", {
      name: "foo",
      priceCents: 100,
      images: ["not-a-url"],
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid url/);
  });

  test("defaults currency to USD", async () => {
    mockPgQuery.mockResolvedValueOnce({ rows: [{ id: "uuid-2" }] });
    const res = await requestJson("post", "/api/items", {
      name: "foo",
      priceCents: 100,
    });
    expect(res.status).toBe(201);
    expect(mockPgQuery).toHaveBeenCalled();
    const params = mockPgQuery.mock.calls[0][1];
    expect(params[3]).toBe("USD");
  });
});

describe("checkout router", () => {
  test("POST /api/checkout/create missing fields returns 400", async () => {
    const res = await requestJson("post", "/api/checkout/create", {});
    expect(res.status).toBe(400);
  });

  test("uses env success and cancel URLs", async () => {
    mockStripeSessionCreate.mockResolvedValueOnce({
      id: "cs_test_123",
      url: "u",
    });
    const prevSuccess = process.env.FRONTEND_SUCCESS_URL;
    const prevCancel = process.env.FRONTEND_CANCEL_URL;
    process.env.FRONTEND_SUCCESS_URL = "https://env/success";
    process.env.FRONTEND_CANCEL_URL = "https://env/cancel";
    await requestJson("post", "/api/checkout/create", {
      items: [{ price: "p1", quantity: 1 }],
    });
    expect(mockStripeSessionCreate.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        success_url: "https://env/success",
        cancel_url: "https://env/cancel",
      }),
    );
    process.env.FRONTEND_SUCCESS_URL = prevSuccess;
    process.env.FRONTEND_CANCEL_URL = prevCancel;
  });

  test("returns session id", async () => {
    mockStripeSessionCreate.mockResolvedValueOnce({
      id: "cs_test_456",
      url: "u",
    });
    const res = await requestJson("post", "/api/checkout/create", {
      items: [{ price: "p1", quantity: 1 }],
    });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe("cs_test_456");
  });

  test("handles stripe errors", async () => {
    mockStripeSessionCreate.mockRejectedValueOnce(new Error("stripe fail"));
    const res = await requestJson("post", "/api/checkout/create", {
      items: [{ price: "p1", quantity: 1 }],
    });
    expect(res.status).toBe(502);
    expect(res.body.error).toBeDefined();
  });
});

describe("stripe webhook router", () => {
  test("missing signature returns 400", async () => {
    mockStripeConstructEvent.mockImplementationOnce(() => {
      throw new Error("Webhook Error: no signature");
    });
    const res = await request(app)
      .post("/stripe/webhook")
      .set("Content-Type", "application/json")
      .send("{}");
    expect(res.status).toBe(400);
  });

  test("invalid signature returns 400", async () => {
    mockStripeConstructEvent.mockImplementationOnce(() => {
      throw new Error("Webhook Error: invalid signature");
    });
    const res = await request(app)
      .post("/stripe/webhook")
      .set("Content-Type", "application/json")
      .set("stripe-signature", "sig")
      .send("{}");
    expect(res.status).toBe(400);
  });

  test("checkout.session.completed triggers side effects", async () => {
    orders.set("sess123", {
      slug: "model",
      email: "user@example.com",
      paid: false,
    });
    mockStripeConstructEvent.mockReturnValueOnce({
      type: "checkout.session.completed",
      data: { object: { id: "sess123" } },
    });
    const res = await request(app)
      .post("/stripe/webhook")
      .set("Content-Type", "application/json")
      .set("stripe-signature", "sig")
      .send("{}");
    expect(res.status).toBe(200);
    expect(orders.get("sess123")?.paid).toBe(true);
    expect(mockSendMail).toHaveBeenCalledWith(
      "user@example.com",
      "Your model is ready",
      "https://cdn.example.com/model.glb",
    );
  });

  test("malformed payload returns 400", async () => {
    mockStripeConstructEvent.mockImplementationOnce(() => {
      throw new Error("Webhook Error: invalid payload");
    });
    const res = await request(app)
      .post("/stripe/webhook")
      .set("Content-Type", "application/json")
      .set("stripe-signature", "sig")
      .send("{");
    expect(res.status).toBe(400);
  });
});

describe("app and server exports", () => {
  test("app exports express instance", () => {
    const mod = require("../src/app");
    expect(typeof mod.app.use).toBe("function");
  });

  test("server.ts listens on configured port", () => {
    const listenMock = jest.fn();
    const PORT = "4321";
    jest.isolateModules(() => {
      jest.doMock("../src/app", () => ({ app: { listen: listenMock } }));
      process.env.PORT = PORT;
      require("../src/server");
    });
    expect(listenMock).toHaveBeenCalledWith(4321, expect.any(Function));
    delete process.env.PORT;
  });
});
