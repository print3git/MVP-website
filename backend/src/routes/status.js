const { Router } = require("express");
const logger = require("../logger.js");
const { capture } = require("../lib/logger");
const db = require("../../db");

let getStatus = () => undefined;
let emitter;
try {
  const gen = require("../queue/generation.ts");
  getStatus = gen.getStatus || getStatus;
  emitter = gen.emitter;
} catch {
  emitter = new (require("events").EventEmitter)();
}

const router = Router();

router.get("/status", async (req, res) => {
  const limit = parseInt(req.query.limit || "10", 10);
  const offset = parseInt(req.query.offset || "0", 10);
  try {
    const result = await db.query(
      "SELECT * FROM jobs ORDER BY created_at DESC LIMIT $1 OFFSET $2",
      [limit, offset],
    );
    res.json(result.rows);
  } catch (err) {
    logger.error("status_list_failed", err);
    capture(err);
    res.status(500).json({ error: "unexpected_error" });
  }
});

router.get("/status/:id", async (req, res) => {
  const id = req.params.id;
  logger.info("status_check", { id });
  try {
    const status = getStatus(id);
    if (status) {
      res.json({ id, ...status });
      return;
    }
    const result = await db.query(
      "SELECT job_id, status, model_url, generated_title FROM jobs WHERE job_id = $1",
      [id],
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    logger.error("status_fetch_failed", err);
    capture(err);
    res.status(500).json({ error: "unexpected_error" });
  }
});

module.exports = router;
