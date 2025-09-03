import { Router } from "express";
import pkg from "../../package.json";
import logger from "../logger";
import { capture } from "../lib/logger";

const router = Router();

router.get("/healthz", (_req, res) => {
  logger.info("health_check");
  try {
    res.json({ ok: true, version: pkg.version });
  } catch (err) {
    logger.error("health_check_failed", err as Error);
    capture(err);
    res.status(500).json({ error: "unexpected_error" });
  }
});

export default router;
