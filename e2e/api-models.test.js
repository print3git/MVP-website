const { test, expect } = require("@playwright/test");
const { startServer } = require("../tests/util");

let server;

test.beforeAll(async () => {
  server = await startServer(3100);
});

test.afterAll(async () => {
  await server.close();
});

test("POST /api/models happy path", async ({ request }) => {
  const res = await request.post(`${server.url}/api/models`, {
    data: { prompt: "e2e", fileKey: "e2e.txt" },
  });
  expect(res.status()).toBe(201);
  const json = await res.json();
  expect(json.url).toContain(process.env.CLOUDFRONT_MODEL_DOMAIN);
});

test("missing prompt returns 400", async ({ request }) => {
  const res = await request.post(`${server.url}/api/models`, {
    data: { fileKey: "e2e.txt" },
  });
  expect(res.status()).toBe(400);
});

test("missing fileKey returns 400", async ({ request }) => {
  const res = await request.post(`${server.url}/api/models`, {
    data: { prompt: "e2e" },
  });
  expect(res.status()).toBe(400);
});
