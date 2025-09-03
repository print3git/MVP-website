import { Router } from "express";
import { emitter, getStatus } from "../queue/generation";
import logger from "../logger";
// eslint-disable-next-line @typescript-eslint/no-var-requires
// use path without extension so jest mocks can intercept
const db = require("../../db");

const router = Router();

router.get("/status", async (req, res) => {
  const limit = parseInt((req.query.limit as string) || "10", 10);
  const offset = parseInt((req.query.offset as string) || "0", 10);
  try {
    const { rows } = await db.query(
      "SELECT * FROM jobs ORDER BY created_at DESC LIMIT $1 OFFSET $2",
      [limit, offset],
    );
    res.json(rows);
  } catch (err) {
    logger.error("status_list_failed", err as Error);
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
    logger.error("status_check_failed", { id });
    res.status(500).json({ error: "unexpected_error" });
  }
});

router.get("/progress/:id", (req, res) => {
  const id = req.params.id;
  logger.info("progress_check", { id });
  try {
    const init = getStatus(id);
    if (!init) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.flushHeaders?.();

    const send = (data: any) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const handler = (status: any) => {
      send(status);
      if (status.state === "succeeded" || status.state === "failed") {
        emitter.removeListener(`progress:${id}`, handler);
        res.end();
      }
    };

    send(init);
    if (init.state === "succeeded" || init.state === "failed") {
      res.end();
      return;
    }
    emitter.on(`progress:${id}`, handler);
    req.on("close", () => emitter.removeListener(`progress:${id}`, handler));
  } catch (err) {
    logger.error("progress_check_failed", { id });
    res.status(500).end();
  }
});

export default router;
