process.env.STRIPE_SECRET_KEY = "test";
process.env.STRIPE_WEBHOOK_SECRET = "whsec";
process.env.DB_URL = "postgres://user:pass@localhost/db";

jest.mock("../../db", () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
  insertGenerationLog: jest.fn().mockResolvedValue({}),
}));

const request = require("supertest");
const app = require("../../server");

jest.mock("../../src/pipeline/generateModel", () => ({
  generateModel: jest.fn(),
}));

const { generateModel } = require("../../src/pipeline/generateModel");

describe("/api/generate regression", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns the URL from generateModel pipeline", async () => {
    generateModel.mockResolvedValueOnce("/models/regression.glb");
    const res = await request(app)
      .post("/api/generate")
      .send({ prompt: "regression" });
    expect(res.status).toBe(200);
    expect(res.body.glb_url).toBe("/models/regression.glb");
  });
});
