const express = require("express");
const router = express.Router();
const db = require("../db");
const validate = require("../middleware/validate");
const { z } = require("zod");

if (!process.env.CLOUDFRONT_MODEL_DOMAIN) {
  throw new Error("Missing CLOUDFRONT_MODEL_DOMAIN");
}

const createModelSchema = z.object({
  prompt: z.string().min(1, "prompt is required"),
  fileKey: z.string().regex(/^[A-Za-z0-9._-]+$/, "invalid fileKey"),
});

router.post("/", validate(createModelSchema), async (req, res) => {
  const { prompt, fileKey } = req.body;
  const domain = process.env.CLOUDFRONT_MODEL_DOMAIN;
  const url = `https://${domain}/${fileKey}`;
  try {
    const { rows } = await db.query(
      "INSERT INTO models(prompt, fileKey, url) VALUES($1,$2,$3) RETURNING id, prompt, fileKey, url, created_at",
      [prompt, fileKey, url],
    );
    res.status(201).json(rows[0]);
  } catch (_err) {
    res.status(500).json({ error: "Failed to create model" });
  }
});

module.exports = router;
