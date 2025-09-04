import { Router } from "express";
import { isReady } from "../../queue/printWorker";
import logger from "../logger";
import { capture } from "../lib/logger";

const router = Router();

router.get("/worker/health", (_req, res) => {
  logger.info("worker_health_check");
  try {
    res.json({ ok: true, ready: isReady() });
  } catch (err) {
    logger.error("worker_health_check_failed", err as Error);
    capture(err);
    res.status(500).json({ error: "unexpected_error" });
  }
});

export default router;
