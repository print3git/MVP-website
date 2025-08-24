import { Router } from "express";
import { Pool } from "pg";
import validate from "../../middleware/validate.js";
import logger from "../../../src/logger.js";
import { insertItem, insertItemSchema } from "../lib/items";

const router = Router();

const pool = new Pool({
  connectionString: process.env.DB_ENDPOINT,
  user: "postgres",
  password: process.env.DB_PASSWORD,
  database: "postgres",
});

router.post(
  "/api/items",
  validate(insertItemSchema),
  async (req, res) => {
    try {
      const { id } = await insertItem(pool, req.body);
      res.status(201).json({ id });
    } catch (err) {
      if (err && typeof err === "object" && "code" in err && err.code === "23505") {
        res.status(409).json({ error: "item name already exists" });
        return;
      }
      logger.error("failed to insert item", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

export default router;
