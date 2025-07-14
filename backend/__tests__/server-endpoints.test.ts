const request = require("supertest");
const jwt = require("jsonwebtoken");

jest.mock("../db", () => ({
  query: jest.fn(),
  insertOrderItems: jest.fn(),
  clearCart: jest.fn(),
  getCartItems: jest.fn(),
  insertGenerationLog: jest.fn(),
}));

jest.mock("../discountCodes", () => ({
  getValidDiscountCode: jest.fn(),
  incrementDiscountUsage: jest.fn(),
  createTimedCode: jest.fn(),
}));

jest.mock("stripe");
const Stripe = require("stripe");
const mockSessionCreate = jest.fn();
Stripe.mockImplementation(() => ({
  checkout: { sessions: { create: mockSessionCreate } },
  webhooks: { constructEvent: jest.fn() },
}));

jest.mock("../src/pipeline/generateModel", () => ({
  generateModel: jest.fn(),
}));

const db = require("../db");
const { generateModel } = require("../src/pipeline/generateModel");

let app;

beforeAll(() => {
  process.env.NODE_ENV = "test";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec";
  process.env.S3_BUCKET = "test-bucket";
  process.env.CLOUDFRONT_MODEL_DOMAIN = "cdn.test";
  app = require("../server");
});

beforeEach(() => {
  jest.clearAllMocks();
  db.query.mockResolvedValue({ rows: [{}] });
  db.insertOrderItems.mockResolvedValue({});
  db.clearCart.mockResolvedValue({});
  db.getCartItems.mockResolvedValue([{ job_id: "1", quantity: 1 }]);
  db.insertGenerationLog.mockResolvedValue({});
  mockSessionCreate.mockResolvedValue({
    id: "sess",
    url: "http://stripe.test",
  });
  generateModel.mockResolvedValue("/model.glb");
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("POST /api/cart/checkout", () => {
  test("returns checkout url on success", async () => {
    const token = jwt.sign({ id: 1 }, process.env.AUTH_SECRET || "secret");
    const res = await request(app)
      .post("/api/cart/checkout")
      .set("Authorization", `Bearer ${token}`)
      .set("Origin", "http://localhost")
      .send();
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ checkoutUrl: "http://stripe.test" });
    expect(mockSessionCreate).toHaveBeenCalled();
    expect(db.clearCart).toHaveBeenCalled();
  });

  test("handles stripe failure with 500", async () => {
    mockSessionCreate.mockRejectedValueOnce(new Error("fail"));
    const token = jwt.sign({ id: 1 }, process.env.AUTH_SECRET || "secret");
    const res = await request(app)
      .post("/api/cart/checkout")
      .set("Authorization", `Bearer ${token}`)
      .set("Origin", "http://localhost")
      .send();
    expect(res.status).toBe(500);
  });
});

describe("POST /api/generate", () => {
  test("returns glb url on success", async () => {
    const res = await request(app).post("/api/generate").send({ prompt: "hi" });
    expect(res.status).toBe(200);
    expect(res.body.glb_url).toBe("/model.glb");
  });

  test("returns 500 when generator throws", async () => {
    generateModel.mockRejectedValueOnce(new Error("boom"));
    const res = await request(app)
      .post("/api/generate")
      .send({ prompt: "bad" });
    expect(res.status).toBe(500);
  });
});

describe("env validation", () => {
  test("throws when CLOUDFRONT_MODEL_DOMAIN missing in production", () => {
    jest.resetModules();
    delete process.env.CLOUDFRONT_MODEL_DOMAIN;
    process.env.NODE_ENV = "production";
    expect(() => require("../server")).toThrow();
    process.env.NODE_ENV = "test";
    process.env.CLOUDFRONT_MODEL_DOMAIN = "cdn.test";
  });
});
