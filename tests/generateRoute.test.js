const request = require("../backend/node_modules/supertest");

jest.mock("../backend/db", () => ({
  query: jest.fn(),
  insertGenerationLog: jest.fn(),
}));

jest.mock("../backend/src/pipeline/generateModel", () => ({
  generateModel: jest.fn(() => Promise.resolve("http://example.com/model.glb")),
}));

const app = require("../backend/server");

test("returns generated URL from pipeline", async () => {
  const res = await request(app).post("/api/generate").field("prompt", "hello");
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ glb_url: "http://example.com/model.glb" });
});
