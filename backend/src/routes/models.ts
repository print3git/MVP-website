import { Router } from "express";
import { Pool } from "pg";
import validate from "../../middleware/validate.js";
import { z } from "zod";
import logger from "../logger.js";
import { getEnv as getEnvVar } from "../../utils/getEnv.js";
import { getEnv as getEnvConfig } from "../env";

const router = Router();

let dbEndpoint: string;
let dbPassword: string;
try {
  dbEndpoint = getEnvVar("DB_ENDPOINT", { required: true })!;
  dbPassword = getEnvVar("DB_PASSWORD", { required: true })!;
} catch (err) {
  logger.error((err as Error).message);
  process.exit(1);
}

const pool = new Pool({
  connectionString: dbEndpoint,
  user: "postgres",
  password: dbPassword,
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
    const { CLOUDFRONT_DOMAIN } = getEnvConfig();
    const cloudfront_url = `https://${CLOUDFRONT_DOMAIN}/${s3_key}`;
    const result = await pool.query(
      "INSERT INTO models (prompt, s3_key, cloudfront_url) VALUES ($1, $2, $3) RETURNING id, prompt, s3_key, cloudfront_url",
      [prompt, s3_key, cloudfront_url],
    );
    res.status(201).json(result.rows[0]);
  } catch (_err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, prompt, s3_key, cloudfront_url FROM models ORDER BY id ASC",
    );
    res.json(result.rows);
  } catch (_err) {
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
      res.status(404).json({ error: "Not Found" });
      return;
    }
    res.json(result.rows[0]);
  } catch (_err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
