const express = require("express");
const { S3Client } = require("@aws-sdk/client-s3");
const { Pool } = require("pg");
const validate = require("../../middleware/validate");
const { z } = require("zod");

const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DB_ENDPOINT,
  user: "postgres",
  password: process.env.DB_PASSWORD,
  database: "postgres",
});

// Initialize an S3 client so the SDK is available if needed
new S3Client();

const createModelSchema = z.object({
  prompt: z.string().min(1, "prompt is required"),
  fileKey: z.string().regex(/^[A-Za-z0-9._-]+$/, "invalid fileKey"),
});

// expose schema for testing
router.createModelSchema = createModelSchema;
router.post("/api/models", validate(createModelSchema), async (req, res) => {
  try {
    const { prompt, fileKey } = req.body;
    const url = `https://${process.env.CLOUDFRONT_DOMAIN}/${fileKey}`;
    const result = await pool.query(
      "INSERT INTO models (prompt, url) VALUES ($1, $2) RETURNING *",
      [prompt, url],
    );
    res.status(201).json(result.rows[0]);
  } catch (_err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
