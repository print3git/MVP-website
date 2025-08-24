const request = require("supertest");

jest.mock("../../src/logger", () => ({ info: jest.fn() }));

let app;
beforeEach(() => {
  jest.resetModules();
  app = require("../dalle_server/server");
});

describe("dalle_server /generate", () => {
  test("returns image when prompt provided", async () => {
    const res = await request(app).post("/generate").send({ prompt: "hi" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      image: expect.stringContaining("data:image/png;base64"),
    });
  });

  test("returns 400 when prompt missing", async () => {
    const res = await request(app).post("/generate").send({});
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "prompt required" });
  });
});
