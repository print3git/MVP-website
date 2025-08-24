import request from "supertest";

process.env.NODE_ENV = "test";
const app = require("../../../backend/server");

afterAll(() => {
  global.__servers?.forEach((s: any) => s.close());
});

describe("API smoke", () => {
  it("GET /api/config/stripe responds 200", async () => {
    const res = await request(app).get("/api/config/stripe");
    expect(res.status).toBe(200);
  });

  it("GET /api/print-slots responds 200", async () => {
    const res = await request(app).get("/api/print-slots");
    expect(res.status).toBe(200);
  });

  it("POST /api/generate-model is unavailable", async () => {
    const res = await request(app)
      .post("/api/generate-model")
      .set("Content-Type", "application/json")
      .send({});
    expect([400, 410]).toContain(res.status);
  });
});
