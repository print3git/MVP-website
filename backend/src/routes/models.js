const express = require("express");
const { S3Client } = require("@aws-sdk/client-s3");
const { Pool } = require("pg");

const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DB_ENDPOINT,
  user: "postgres",
  password: process.env.DB_PASSWORD,
  database: "postgres",
});

// Initialize an S3 client so the SDK is available if needed
new S3Client();

router.post("/api/models", async (req, res) => {
  const { prompt, fileKey } = req.body;
  const url = `https://${process.env.CLOUDFRONT_DOMAIN}/${fileKey}`;
  try {
    const result = await pool.query(
      "INSERT INTO models (prompt, url) VALUES ($1, $2) RETURNING *",
      [prompt, url],
    );
    res.status(201).json(result.rows[0]);
  } catch (_err) {
    res.status(500).json({ error: "Failed to insert model" });
  }
});

module.exports = router;
