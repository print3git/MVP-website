import request from "supertest";

jest.mock("../queue/printWorker", () => ({
  isReady: jest.fn(),
}));

const { isReady } = require("../queue/printWorker");
const app = require("../server");

test("reports ready state", async () => {
  isReady.mockReturnValue(true);
  const res = await request(app).get("/api/worker/health");
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ ok: true, ready: true });
});

test("reports unready state", async () => {
  isReady.mockReturnValue(false);
  const res = await request(app).get("/api/worker/health");
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ ok: true, ready: false });
});

