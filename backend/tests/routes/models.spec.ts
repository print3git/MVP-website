process.env.DB_ENDPOINT = "postgres://user:pass@localhost/db";
process.env.DB_PASSWORD = "pass";
process.env.CLOUDFRONT_DOMAIN = "cdn.example.com";
process.env.STRIPE_TEST_KEY = "sk_test_dummy";

import request from "supertest";
import type { Express } from "express";

jest.mock("pg");
import { Pool } from "pg";

function setup() {
  const pool = { query: jest.fn() } as any;
  (Pool as any).mockImplementation(() => pool);
  let app: Express;
  jest.isolateModules(() => {
    app = require("../../src/app").default;
  });
  return { app: app!, pool };
}

afterEach(() => {
  jest.clearAllMocks();
});

describe("models routes", () => {
  test("creating a model inserts into DB and returns the CloudFront URL", async () => {
    const { app, pool } = setup();
    const row = {
      id: 1,
      prompt: "p",
      s3_key: "file.glb",
      cloudfront_url: "https://cdn.example.com/file.glb",
    };
    pool.query.mockResolvedValueOnce({ rows: [row] });
    const res = await request(app)
      .post("/api/models")
      .send({ prompt: "p", s3_key: "file.glb" });
    expect(res.status).toBe(201);
    expect(res.body).toEqual(row);
    expect(pool.query).toHaveBeenCalledWith(
      "INSERT INTO models (prompt, s3_key, cloudfront_url) VALUES ($1, $2, $3) RETURNING id, prompt, s3_key, cloudfront_url",
      ["p", "file.glb", "https://cdn.example.com/file.glb"],
    );
  });

  test("listing models returns all inserted models", async () => {
    const { app, pool } = setup();
    const rows = [
      {
        id: 1,
        prompt: "a",
        s3_key: "a.glb",
        cloudfront_url: "https://cdn.example.com/a.glb",
      },
      {
        id: 2,
        prompt: "b",
        s3_key: "b.glb",
        cloudfront_url: "https://cdn.example.com/b.glb",
      },
    ];
    pool.query.mockResolvedValueOnce({ rows });
    const res = await request(app).get("/api/models");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(rows);
  });

  test("invalid input missing fields returns 400", async () => {
    const { app } = setup();
    let res = await request(app).post("/api/models").send({ s3_key: "f" });
    expect(res.status).toBe(400);
    res = await request(app).post("/api/models").send({ prompt: "p" });
    expect(res.status).toBe(400);
  });
});
