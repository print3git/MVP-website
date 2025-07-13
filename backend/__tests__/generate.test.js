const request = require("supertest");

jest.mock("../db", () => ({
  query: jest.fn(),
  insertGenerationLog: jest.fn(),
}));

jest.mock("../src/pipeline/generateModel", () => ({
  generateModel: jest.fn(),
}));

jest.mock("stripe");
const Stripe = require("stripe");
Stripe.mockImplementation(() => ({
  checkout: { sessions: { create: jest.fn() } },
  webhooks: { constructEvent: jest.fn() },
}));

jest.mock("axios");

jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn(() => ({})),
  PutObjectCommand: jest.fn(),
  HeadBucketCommand: jest.fn(),
}));

const db = require("../db");
const { generateModel } = require("../src/pipeline/generateModel");

let app;

beforeAll(() => {
  process.env.NODE_ENV = "test";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec";
  process.env.S3_BUCKET = "test-bucket";
  app = require("../server");
});

beforeEach(() => {
  db.query.mockResolvedValue({});
  db.insertGenerationLog.mockResolvedValue({});
  generateModel.mockReset();
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("POST /api/generate", () => {
  test("returns glb url when prompt provided", async () => {
    generateModel.mockResolvedValue("/model.glb");
    const res = await request(app).post("/api/generate").send({ prompt: "hi" });
    expect(res.status).toBe(200);
    expect(res.body.glb_url).toBe("/model.glb");
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO jobs"),
      expect.any(Array),
    );
    expect(db.insertGenerationLog).toHaveBeenCalled();
  });

  test("accepts image upload when no prompt", async () => {
    generateModel.mockResolvedValue("/img.glb");
    const res = await request(app)
      .post("/api/generate")
      .attach("image", Buffer.from("data"), "file.png");
    expect(res.status).toBe(200);
    expect(res.body.glb_url).toBe("/img.glb");
    expect(generateModel).toHaveBeenCalledWith({
      prompt: undefined,
      image: expect.any(String),
    });
  });

  test("400 when both prompt and image missing", async () => {
    const res = await request(app).post("/api/generate").send({});
    expect(res.status).toBe(400);
  });

  test("500 when model generation fails", async () => {
    generateModel.mockRejectedValue(new Error("boom"));
    const res = await request(app)
      .post("/api/generate")
      .send({ prompt: "fail" });
    expect(res.status).toBe(500);
    expect(db.insertGenerationLog).not.toHaveBeenCalled();
  });

  test("500 when database insert fails", async () => {
    db.query.mockRejectedValueOnce(new Error("db fail"));
    const res = await request(app).post("/api/generate").send({ prompt: "hi" });
    expect(res.status).toBe(500);
  });
});
