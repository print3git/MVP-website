const express = require("express");
const router = express.Router();
const db = require("../db");
const validate = require("../middleware/validate");
const { z } = require("zod");
const { getEnv } = require("../utils/getEnv");

const CLOUDFRONT_MODEL_DOMAIN = getEnv("CLOUDFRONT_MODEL_DOMAIN");
if (!CLOUDFRONT_MODEL_DOMAIN && process.env.NODE_ENV !== "test") {
  throw new Error("Missing CLOUDFRONT_MODEL_DOMAIN");
}

const createModelSchema = z.object({
  prompt: z.string().min(1, "prompt is required"),
  fileKey: z.string().regex(/^[A-Za-z0-9._-]+$/, "invalid fileKey"),
});

// expose schema for testing
router.createModelSchema = createModelSchema;

router.post("/", validate(createModelSchema), async (req, res, next) => {
  try {
    const { prompt, fileKey } = req.body;
    const url = `https://${CLOUDFRONT_MODEL_DOMAIN}/${fileKey}`;
    const { rows } = await db.query(
      "INSERT INTO models(prompt, fileKey, url) VALUES($1,$2,$3) RETURNING id, prompt, fileKey, url, created_at",
      [prompt, fileKey, url],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
