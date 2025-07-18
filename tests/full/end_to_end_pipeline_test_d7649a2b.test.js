const request = require("../../backend/node_modules/supertest");
const axios = require("axios");
const app = require("../../backend/server");

// Only run this expensive test when RUN_PIPELINE_TESTS is truthy
const run = process.env.RUN_PIPELINE_TESTS ? test : test.skip;

run("end-to-end generator pipeline", async () => {
  jest.setTimeout(120000);
  const requiredEnv = [
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "STRIPE_SECRET_KEY",
    "HUGGINGFACE_API_KEY",
    "DB_URL",
  ];
  for (const key of requiredEnv) {
    if (!process.env[key]) {
      throw new Error(`Missing required env var: ${key}`);
    }
  }

  const res = await request(app)
    .post("/api/generate")
    .field("prompt", "diagnostic monkey");
  expect(res.status).toBe(200);
  const url = res.body && res.body.glb_url;
  expect(url).toBeDefined();
  expect(url).toMatch(/\.glb$/);

  const head = await axios.head(url, { validateStatus: () => true });
  expect(head.status).toBe(200);
});
