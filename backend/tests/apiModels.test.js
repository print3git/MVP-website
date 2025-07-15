process.env.STRIPE_SECRET_KEY = "test";
process.env.STRIPE_WEBHOOK_SECRET = "whsec";
process.env.DB_URL = "postgres://user:pass@localhost/db";
process.env.CLOUDFRONT_MODEL_DOMAIN = "cdn.example.com";
process.env.AWS_REGION = "us-east-1";
process.env.S3_BUCKET = "bucket";

jest.mock("../db", () => ({
  query: jest.fn(),
}));
const db = require("../db");

const request = require("supertest");
const app = require("../server");

afterEach(() => {
  db.query.mockReset();
});

test("GET /api/models returns list", async () => {
  db.query.mockResolvedValueOnce({
    rows: [{ id: 1, s3_key: "m1.glb", uploaded_at: "2024-01-01" }],
  });
  const res = await request(app).get("/api/models");
  expect(res.status).toBe(200);
  expect(res.body).toEqual([
    { id: 1, key: "m1.glb", uploaded_at: "2024-01-01" },
  ]);
});

test("POST /api/models creates model with CDN url", async () => {
  const body = { prompt: "cat", fileKey: "cat.glb" };
  const url = `https://${process.env.CLOUDFRONT_MODEL_DOMAIN}/${body.fileKey}`;
  db.query.mockResolvedValueOnce({
    rows: [
      {
        id: 2,
        prompt: body.prompt,
        filekey: body.fileKey,
        url,
        created_at: "2024-01-02",
      },
    ],
  });
  const res = await request(app).post("/api/models").send(body);
  expect(res.status).toBe(201);
  expect(res.body).toEqual({
    id: 2,
    prompt: body.prompt,
    filekey: body.fileKey,
    url,
    created_at: "2024-01-02",
  });
  const call = db.query.mock.calls[0];
  expect(call[0]).toContain("INSERT INTO models");
  expect(call[1]).toEqual([body.prompt, body.fileKey, url]);
});

test("POST /api/models requires fields", async () => {
  const res = await request(app).post("/api/models").send({});
  expect(res.status).toBe(400);
});

test("POST /api/models handles db error", async () => {
  db.query.mockRejectedValueOnce(new Error("fail"));
  const res = await request(app)
    .post("/api/models")
    .send({ prompt: "bad", fileKey: "bad.glb" });
  expect(res.status).toBe(500);
  expect(res.body).toEqual({ error: "Internal Server Error" });
});
