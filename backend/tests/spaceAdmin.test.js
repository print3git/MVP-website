process.env.STRIPE_SECRET_KEY = "test";
process.env.STRIPE_WEBHOOK_SECRET = "whsec";
process.env.DB_URL = "postgres://user:pass@localhost/db";
process.env.HUNYUAN_API_KEY = "test";
process.env.HUNYUAN_SERVER_URL = "http://localhost:4000";

jest.mock("../db", () => ({
  query: jest.fn(),
  createSpace: jest.fn(),
  listAllSpaces: jest.fn(),
}));
const db = require("../db");
const request = require("supertest");
const app = require("../server");

beforeEach(() => {
  jest.clearAllMocks();
});

test("GET /api/admin/spaces requires admin", async () => {
  const res = await request(app).get("/api/admin/spaces");
  expect(res.status).toBe(401);
});

test("GET /api/admin/spaces returns spaces", async () => {
  db.listAllSpaces.mockResolvedValueOnce([{ id: 1, region: "east" }]);
  const res = await request(app)
    .get("/api/admin/spaces")
    .set("x-admin-token", "admin");
  expect(res.status).toBe(200);
  expect(res.body[0].region).toBe("east");
});

test("POST /api/admin/spaces creates space", async () => {
  db.createSpace.mockResolvedValueOnce({ id: 2 });
  const res = await request(app)
    .post("/api/admin/spaces")
    .set("x-admin-token", "admin")
    .send({ region: "west", costCents: 10000, address: "123" });
  expect(res.status).toBe(200);
  expect(db.createSpace).toHaveBeenCalledWith("west", 10000, "123");
});
