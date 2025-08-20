jest.mock("../db", () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
}));
const request = require("supertest");
const app = require("../server");

test("GET /healthz returns ok", async () => {
  const res = await request(app).get("/healthz");
  expect(res.status).toBe(200);
  expect(res.body).toMatchObject({ ok: true, version: expect.any(String) });
});

test("GET /readyz returns ok", async () => {
  const res = await request(app).get("/readyz");
  expect(res.status).toBe(200);
  expect(res.body).toMatchObject({ ok: true, version: expect.any(String) });
});

test("GET /health returns ok", async () => {
  const res = await request(app).get("/health");
  expect(res.status).toBe(200);
  expect(res.body).toMatchObject({ ok: true, version: expect.any(String) });
});
