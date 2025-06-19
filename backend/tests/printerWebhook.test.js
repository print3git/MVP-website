process.env.STRIPE_SECRET_KEY = "test";
process.env.STRIPE_WEBHOOK_SECRET = "whsec";
process.env.DB_URL = "postgres://user:pass@localhost/db";
process.env.HUNYUAN_API_KEY = "test";

jest.mock("../db", () => ({
  query: jest.fn().mockResolvedValue({}),
}));
const db = require("../db");

const request = require("supertest");
const app = require("../server");

test("POST /api/webhook/printer-complete updates status", async () => {
  const res = await request(app)
    .post("/api/webhook/printer-complete")
    .send({ jobId: "j1" });
  expect(res.status).toBe(204);
  expect(db.query).toHaveBeenCalledWith(
    "UPDATE print_jobs SET status='complete' WHERE job_id=$1",
    ["j1"],
  );
});

test("POST /api/webhook/printer-complete requires jobId", async () => {
  const res = await request(app).post("/api/webhook/printer-complete").send({});
  expect(res.status).toBe(400);
});
