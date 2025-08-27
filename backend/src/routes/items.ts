import { Router } from "express";
import { Pool } from "pg";
import validate from "../../middleware/validate.js";
import logger from "../logger.js";
import { insertItem, insertItemSchema } from "../lib/items";
import { getEnv } from "../../utils/getEnv.js";

const router = Router();

const dbEndpoint = getEnv("DB_ENDPOINT");
const dbPassword = getEnv("DB_PASSWORD");

if (!dbEndpoint || !dbPassword) {
  logger.error("Missing DB_ENDPOINT or DB_PASSWORD");
  process.exit(1);
}

const pool = new Pool({
  connectionString: dbEndpoint,
  user: "postgres",
  password: dbPassword,
  database: "postgres",
});

router.post("/api/items", validate(insertItemSchema), async (req, res) => {
  try {
    const { id } = await insertItem(pool, req.body);
    res.status(201).json({ id });
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      err.code === "23505"
    ) {
      res.status(409).json({ error: "item name already exists" });
      return;
    }
    logger.error("failed to insert item", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
