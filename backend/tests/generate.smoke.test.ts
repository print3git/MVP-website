const request = require("supertest");

process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "sk";
process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "wh";
process.env.DB_URL = process.env.DB_URL || "postgres://user:pass@localhost/db";

jest.mock("../db", () => ({
  createJob: jest.fn().mockResolvedValue({ id: "job-1" }),
  linkModelToJob: jest.fn(),
  insertGenerationLog: jest.fn(),
}));

jest.mock("../src/lib/generateModel", () => ({
  generateModel: jest.fn().mockResolvedValue(Buffer.from("model")),
}));

jest.mock("../src/lib/preserveColors", () => ({
  preserveColors: jest.fn().mockResolvedValue(Buffer.from("model")),
}));

jest.mock("../src/lib/uploadS3", () => ({
  uploadS3: jest.fn().mockResolvedValue({ url: "/test.glb", key: "test.glb" }),
}));

const app = require("../server");

describe("POST /api/generate", () => {
  test("400 for missing input", async () => {
    const res = await request(app)
      .post("/api/generate")
      .set("Content-Type", "application/json");
    expect(res.status).toBe(400);
  });

  test("200 for JSON prompt", async () => {
    const res = await request(app)
      .post("/api/generate")
      .send({ prompt: "hi" })
      .set("Content-Type", "application/json");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("url", "/test.glb");
  });

  test("200 for multipart image", async () => {
    const res = await request(app)
      .post("/api/generate")
      .attach("image", Buffer.from("123"), { filename: "test.png" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("url", "/test.glb");
  });
});
