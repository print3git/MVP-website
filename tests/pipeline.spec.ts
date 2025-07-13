require("dotenv/config");
const request = require("../backend/node_modules/supertest");
const axios = require("axios");
const app = require("../backend/server");

const FALLBACK_GLB =
  "https://modelviewer.dev/shared-assets/models/Astronaut.glb";

describe("full pipeline", () => {
  test("health endpoint", async () => {
    console.log("→ GET /api/health");
    const res = await request(app).get("/api/health");
    console.log("← status", res.status);
    expect(res.status).toBe(200);
  });

  test("generate model from prompt", async () => {
    console.log("→ POST /api/generate");
    const res = await request(app)
      .post("/api/generate")
      .field("prompt", "diagnostic monkey");
    console.log("← status", res.status, "body", res.body);
    expect(res.status).toBe(200);
    const url = res.body.glb_url;
    expect(url).toBeDefined();
    expect(url).not.toBe(FALLBACK_GLB);
    const head = await axios.head(url, { validateStatus: () => true });
    console.log("HEAD", head.status);
    expect(head.status).toBe(200);
  });
});
