const request = require("supertest");

process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "sk";
process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "wh";
process.env.DB_URL = process.env.DB_URL || "postgres://user:pass@localhost/db";

jest.mock("../src/db.js", () => ({
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

const db = require("../src/db.js");
const app = require("../server");

describe("POST /api/generate", () => {
  test("returns jobId and url and logs generation", async () => {
    const res = await request(app)
      .post("/api/generate")
      .send({ prompt: "hi" })
      .set("Content-Type", "application/json");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ jobId: "job-1", url: "/test.glb" });
    expect(db.createJob).toHaveBeenCalled();
    expect(db.insertGenerationLog).toHaveBeenCalled();
  });
});
