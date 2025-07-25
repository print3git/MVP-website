jest.mock("../../src/pipeline/generateModel", () => ({
  generateModel: jest.fn(),
}));
jest.mock("../../db", () => ({
  query: jest.fn(),
  insertGenerationLog: jest.fn(),
  insertModel: jest.fn(),
}));
const request = require("supertest");
const { generateModel } = require("../../src/pipeline/generateModel");
process.env.STRIPE_WEBHOOK_SECRET = "test";
const app = require("../../server");

const itMaybe = process.env.RUN_PIPELINE_TESTS ? test : test.skip;

describe("/api/generate regression", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  itMaybe("returns the URL from generateModel pipeline", async () => {
    generateModel.mockResolvedValueOnce("/models/regression.glb");
    const res = await request(app)
      .post("/api/generate")
      .send({ prompt: "regression" });
    expect(res.status).toBe(200);
    expect(res.body.glb_url).toBe("/models/regression.glb");
    expect(generateModel).toHaveBeenCalledWith({
      prompt: "regression",
      image: undefined,
    });
    expect(generateModel).toHaveBeenCalledTimes(1);
  });
});
