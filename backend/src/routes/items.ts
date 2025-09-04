import { Router } from "express";
import validate from "../../middleware/validate";
import logger from "../logger";
import { capture } from "../lib/logger";
import { insertItem, insertItemSchema } from "../lib/items";
import { getPgPool } from "../db";

const router = Router();

const pool = getPgPool();

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
    capture(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
