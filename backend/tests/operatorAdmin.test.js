process.env.STRIPE_SECRET_KEY = "test";
process.env.STRIPE_WEBHOOK_SECRET = "whsec";
process.env.DB_URL = "postgres://user:pass@localhost/db";
process.env.HUNYUAN_API_KEY = "test";
process.env.HUNYUAN_SERVER_URL = "http://localhost:4000";

jest.mock("../db", () => ({
  query: jest.fn(),
  createRemoteOperator: jest.fn(),
  listRemoteOperators: jest.fn(),
  approveRemoteOperator: jest.fn(),
}));
const db = require("../db");

const request = require("supertest");
const app = require("../server");

beforeEach(() => {
  jest.clearAllMocks();
});

test("POST /api/operators creates operator", async () => {
  db.createRemoteOperator.mockResolvedValueOnce({ id: 1 });
  const res = await request(app)
    .post("/api/operators")
    .send({ name: "Op", email: "op@example.com", trainingCompleted: true });
  expect(res.status).toBe(200);
  expect(db.createRemoteOperator).toHaveBeenCalledWith(
    "Op",
    "op@example.com",
    true,
  );
});

test("GET /api/admin/operators returns list", async () => {
  db.listRemoteOperators.mockResolvedValueOnce([{ id: 2 }]);
  const res = await request(app)
    .get("/api/admin/operators")
    .set("x-admin-token", "admin");
  expect(res.status).toBe(200);
  expect(res.body[0].id).toBe(2);
});

test("POST /api/admin/operators/:id/approve approves", async () => {
  db.approveRemoteOperator.mockResolvedValueOnce({ id: 3 });
  const res = await request(app)
    .post("/api/admin/operators/3/approve")
    .set("x-admin-token", "admin")
    .send({ hub_id: 5 });
  expect(res.status).toBe(200);
  expect(db.approveRemoteOperator).toHaveBeenCalledWith("3", 5);
});
