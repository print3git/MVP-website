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

  test("returns user when found", async () => {
    const user = { id: 1, username: "alice", email: "a@example.com" };
    users.findUserById.mockResolvedValueOnce(user);
    const res = await request(app).get("/api/users/1");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(user);
  });

  test("returns 404 when missing", async () => {
    users.findUserById.mockResolvedValueOnce(undefined);
    const res = await request(app).get("/api/users/2");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "User not found" });
  });
});
