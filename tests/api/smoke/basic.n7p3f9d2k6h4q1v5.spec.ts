import request from "supertest";

process.env.NODE_ENV = "test";
process.env.STRIPE_PUBLISHABLE_KEY = "pk_test";
const app = require("../../../backend/server");

const EXPECT = Number(process.env.EXPECT_REMOVED_STATUS || 410);

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

  it("POST /api/generate-model returns expected removal status", async () => {
    const res = await request(app).post("/api/generate-model").send({});
    expect([EXPECT]).toContain(res.status);
    if (EXPECT === 410) expect(res.body && res.body.error).toBe("removed");
  });
});
