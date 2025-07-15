const request = require("supertest");

jest.mock("../users", () => ({
  findUserById: jest.fn(),
}));

const users = require("../users");

let app;

beforeAll(() => {
  process.env.NODE_ENV = "test";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec";
  process.env.S3_BUCKET = "test-bucket";
  process.env.CLOUDFRONT_MODEL_DOMAIN = "cdn.test";
  app = require("../server");
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("GET /api/users/:id", () => {
  test("returns 500 when findUserById throws", async () => {
    users.findUserById.mockRejectedValue(new Error("boom"));
    const res = await request(app).get("/api/users/123");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Internal Server Error" });
  });
  test("returns 404 when user missing", async () => {
    users.findUserById.mockResolvedValue(undefined);
    const res = await request(app).get("/api/users/456");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "User not found" });
  });

  test("handles null id parameter", async () => {
    users.findUserById.mockResolvedValue(null);
    const res = await request(app).get("/api/users/null");
    expect(res.status).toBe(404);
  });
});
