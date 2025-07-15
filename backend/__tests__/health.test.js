const request = require("supertest");
const app = require("../server");

beforeAll(() => {
  // setup mocks here if needed
});

afterAll(() => {
  jest.restoreAllMocks();
});

test("GET /health returns ok", async () => {
  const res = await request(app).get("/health");
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ status: "ok" });
});
