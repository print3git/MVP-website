const request = require("supertest");

jest.mock("../db", () => ({
  query: jest.fn(),
  insertGenerationLog: jest.fn(),
}));

jest.mock("../src/pipeline/generateModel", () => ({
  generateModel: jest.fn(),
}));

process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "whsec";

const { generateModel } = require("../src/pipeline/generateModel");
const app = require("../server");

afterEach(() => {
  jest.resetAllMocks();
});

test("POST /api/generate returns glb url from pipeline", async () => {
  generateModel.mockResolvedValue("/models/test.glb");
  const res = await request(app).post("/api/generate").send({ prompt: "test" });
  expect(res.status).toBe(200);
  expect(res.body.glb_url).toBe("/models/test.glb");
});
