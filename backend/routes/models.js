const express = require("express");
const router = express.Router();
const db = require("../db");

if (!process.env.CLOUDFRONT_MODEL_DOMAIN) {
  throw new Error("Missing CLOUDFRONT_MODEL_DOMAIN");
}

router.post("/", async (req, res) => {
  const { prompt, fileKey } = req.body || {};
  if (!prompt || !fileKey) {
    return res.status(400).json({ error: "prompt and fileKey are required" });
  }
  const domain = process.env.CLOUDFRONT_MODEL_DOMAIN;
  const url = `https://${domain}/${fileKey}`;
  try {
    const { rows } = await db.query(
      "INSERT INTO models(prompt, fileKey, url) VALUES($1,$2,$3) RETURNING id, prompt, fileKey, url, created_at",
      [prompt, fileKey, url],
    );
    req.logger.info("Model created", { id: rows[0].id });
    res.status(201).json(rows[0]);
  } catch (_err) {
    req.logger.error("Failed to create model", _err);
    res.status(500).json({ error: "Failed to create model" });
  }
});

module.exports = router;
