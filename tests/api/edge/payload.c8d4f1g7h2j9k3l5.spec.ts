import request from "supertest";
import fs from "fs";
import path from "path";

process.env.NODE_ENV = "test";
const app = require("../../../backend/server");

afterAll(() => {
  global.__servers?.forEach((s: any) => s.close());
});

describe("API edge cases", () => {
  test("POST /api/generate without prompt or image returns 400", async () => {
    const res = await request(app).post("/api/generate").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Prompt or image is required");
  });

  test("POST /api/upload-model without file returns 400", async () => {
    const res = await request(app).post("/api/upload-model");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("No file uploaded");
  });

  test("SDK exports exclude generateModel variants", () => {
    const sdkDir = path.join(__dirname, "../../../js");
    const files = fs.readdirSync(sdkDir).filter((f) => f.endsWith(".js"));
    const banned = [
      /export\s+(?:function|const|class)\s+generateModel/i,
      /generate_model/,
      /generate-model/,
    ];
    for (const file of files) {
      const content = fs.readFileSync(path.join(sdkDir, file), "utf8");
      for (const pattern of banned) {
        expect(content).not.toMatch(pattern);
      }
    }
  });
});
