process.env.STRIPE_SECRET_KEY = "test";
process.env.STRIPE_WEBHOOK_SECRET = "whsec";
process.env.DB_URL = "postgres://user:pass@localhost/db";
process.env.CLOUDFRONT_MODEL_DOMAIN = "cdn.example.com";
process.env.AWS_REGION = "us-east-1";
process.env.S3_BUCKET = "bucket";

jest.mock("../../db", () => ({
  query: jest.fn(),
}));
const db = require("../../db");
const request = require("supertest");
const express = require("express");
const app = express();
app.use(express.json());

afterEach(() => {
  db.query.mockReset();
});

describe("preemptive /api/models contract", () => {
  it.skip("POST /api/models with { prompt, s3_key } returns 201 and body includes { cloudfront_url, id }", async () => {
    const payload = { prompt: "cat", s3_key: "cat.glb" };
    db.query.mockResolvedValueOnce({ rows: [{ id: 1, ...payload }] });
    const res = await request(app).post("/api/models").send(payload);
    expect(res.status).toBe(201);
    expect(res.body).toEqual(
      expect.objectContaining({
        id: 1,
        cloudfront_url: `https://${process.env.CLOUDFRONT_MODEL_DOMAIN}/${payload.s3_key}`,
      }),
    );
  });

  it.skip("POST /api/models missing prompt returns 400", async () => {
    const res = await request(app)
      .post("/api/models")
      .send({ s3_key: "cat.glb" });
    expect(res.status).toBe(400);
  });

  it.skip("POST /api/models missing s3_key returns 400", async () => {
    const res = await request(app).post("/api/models").send({ prompt: "cat" });
    expect(res.status).toBe(400);
  });

  it.skip("POST /api/models empty prompt returns 400", async () => {
    const res = await request(app)
      .post("/api/models")
      .send({ prompt: "", s3_key: "cat.glb" });
    expect(res.status).toBe(400);
  });

  it.skip("POST /api/models empty s3_key returns 400", async () => {
    const res = await request(app)
      .post("/api/models")
      .send({ prompt: "cat", s3_key: "" });
    expect(res.status).toBe(400);
  });

  it.skip("POST /api/models non-string prompt returns 400", async () => {
    const res = await request(app)
      .post("/api/models")
      .send({ prompt: 123, s3_key: "cat.glb" });
    expect(res.status).toBe(400);
  });

  it.skip("POST /api/models non-string s3_key returns 400", async () => {
    const res = await request(app)
      .post("/api/models")
      .send({ prompt: "cat", s3_key: 123 });
    expect(res.status).toBe(400);
  });

  it.skip("POST /api/models invalid s3_key format returns 400", async () => {
    const res = await request(app)
      .post("/api/models")
      .send({ prompt: "cat", s3_key: "../cat.glb" });
    expect(res.status).toBe(400);
  });

  it.skip("GET /api/models returns array of models with prompt and cloudfront_url", async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ id: 1, prompt: "cat", s3_key: "cat.glb" }],
    });
    const res = await request(app).get("/api/models");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        id: 1,
        prompt: "cat",
        cloudfront_url: `https://${process.env.CLOUDFRONT_MODEL_DOMAIN}/cat.glb`,
      },
    ]);
  });

  it.skip("GET /api/models returns empty array when no models exist", async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get("/api/models");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it.skip("GET /api/models/:id returns a single model if it exists", async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ id: 1, prompt: "cat", s3_key: "cat.glb" }],
    });
    const res = await request(app).get("/api/models/1");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: 1,
      prompt: "cat",
      cloudfront_url: `https://${process.env.CLOUDFRONT_MODEL_DOMAIN}/cat.glb`,
    });
  });

  it.skip("GET /api/models/:id returns 404 when model not found", async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get("/api/models/999");
    expect(res.status).toBe(404);
  });

  it.skip("GET /api/models/:id invalid id returns 400", async () => {
    const res = await request(app).get("/api/models/not-a-number");
    expect(res.status).toBe(400);
  });

  it.skip("POST /api/models returns 500 on database error", async () => {
    const payload = { prompt: "cat", s3_key: "cat.glb" };
    db.query.mockRejectedValueOnce(new Error("db failure"));
    const res = await request(app).post("/api/models").send(payload);
    expect(res.status).toBe(500);
  });

  it.skip("GET /api/models/:id returns 500 on database error", async () => {
    db.query.mockRejectedValueOnce(new Error("db failure"));
    const res = await request(app).get("/api/models/1");
    expect(res.status).toBe(500);
  });
});
