const request = require("supertest");
process.env.STRIPE_WEBHOOK_SECRET = "whsec";
jest.mock("../../src/pipeline/generateModel", () => ({
  generateModel: jest.fn(),
}));
const app = require("../../server");
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
