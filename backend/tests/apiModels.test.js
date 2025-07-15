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

test("POST /api/models rejects invalid fileKey", async () => {
  const res = await request(app)
    .post("/api/models")
    .send({ prompt: "a", fileKey: "../bad" });
  expect(res.status).toBe(400);
});

test("POST /api/models accepts hyphen and underscore", async () => {
  const body = { prompt: "a", fileKey: "my-file_1.glb" };
  const url = `https://${process.env.CLOUDFRONT_MODEL_DOMAIN}/${body.fileKey}`;
  db.query.mockResolvedValueOnce({ rows: [{ id: 3, ...body, url }] });
  const res = await request(app).post("/api/models").send(body);
  expect(res.status).toBe(201);
  expect(res.body.url).toBe(url);
});

test("POST /api/models/:id/public toggles visibility", async () => {
  const jwt = require("jsonwebtoken");
  const token = jwt.sign({ id: "u1" }, "secret");
  db.query.mockResolvedValueOnce({ rows: [{ is_public: true }] });
  const res = await request(app)
    .post("/api/models/5/public")
    .set("authorization", `Bearer ${token}`)
    .send({ isPublic: true });
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ is_public: true });
  expect(db.query).toHaveBeenCalledWith(
    "UPDATE jobs SET is_public=$1 WHERE job_id=$2 AND user_id=$3 RETURNING is_public",
    [true, "5", "u1"],
  );
});

test("DELETE /api/models/:id removes model", async () => {
  const jwt = require("jsonwebtoken");
  const token = jwt.sign({ id: "u1" }, "secret");
  db.query.mockResolvedValueOnce({ rows: [{ job_id: "5" }] });
  db.query.mockResolvedValueOnce({});
  db.query.mockResolvedValueOnce({});
  const res = await request(app)
    .delete("/api/models/5")
    .set("authorization", `Bearer ${token}`);
  expect(res.status).toBe(204);
  expect(db.query).toHaveBeenCalledWith(
    "DELETE FROM jobs WHERE job_id=$1 AND user_id=$2 RETURNING job_id",
    ["5", "u1"],
  );
  expect(db.query).toHaveBeenCalledWith("DELETE FROM likes WHERE model_id=$1", [
    "5",
  ]);
  expect(db.query).toHaveBeenCalledWith("DELETE FROM shares WHERE job_id=$1", [
    "5",
  ]);
});
