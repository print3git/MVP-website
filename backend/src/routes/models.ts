import { Router } from "express";
import { Pool } from "pg";
import validate from "../../middleware/validate.js";
import { z } from "zod";
import { getEnv } from "../env";
import logger from "../logger.js";
import { capture } from "../lib/logger";

const router = Router();

const pool = new Pool({
  connectionString: process.env.DB_ENDPOINT,
  user: "postgres",
  password: process.env.DB_PASSWORD,
  database: "postgres",
});

export const createModelSchema = z.object({
  prompt: z.string().min(1, "prompt is required"),
  s3_key: z.string().regex(/^[A-Za-z0-9._-]+$/, "invalid s3_key"),
});

(router as any).createModelSchema = createModelSchema;

router.post("/", validate(createModelSchema), async (req, res) => {
  try {
    const { prompt, s3_key } = req.body as { prompt: string; s3_key: string };
    const { CLOUDFRONT_DOMAIN } = getEnv();
    const cloudfront_url = `https://${CLOUDFRONT_DOMAIN}/${s3_key}`;
    const result = await pool.query(
      "INSERT INTO models (prompt, s3_key, cloudfront_url) VALUES ($1, $2, $3) RETURNING id, prompt, s3_key, cloudfront_url",
      [prompt, s3_key, cloudfront_url],
    );
    const model = result.rows[0];
    logger.info("model_created", { id: model.id });
    res.status(201).json(model);
  } catch (err) {
    logger.error("model_create_failed", err as Error);
    capture(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, prompt, s3_key, cloudfront_url FROM models ORDER BY id ASC",
    );
    logger.info("models_listed", { count: result.rows.length });
    res.json(result.rows);
  } catch (err) {
    logger.error("models_list_failed", err as Error);
    capture(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, prompt, s3_key, cloudfront_url FROM models WHERE id=$1",
      [req.params.id],
    );
    if (result.rows.length === 0) {
      logger.warn("model_not_found", { id: req.params.id });
      res.status(404).json({ error: "Not Found" });
      return;
    }
    const model = result.rows[0];
    logger.info("model_retrieved", { id: model.id });
    res.json(model);
  } catch (err) {
    logger.error("model_get_failed", { id: req.params.id });
    capture(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
