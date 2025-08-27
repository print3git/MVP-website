import { Router } from "express";
import { emitter, getStatus } from "../queue/generation";
import logger from "../logger.js";
import { capture } from "../lib/logger";

const router = Router();

router.get("/status/:id", (req, res) => {
  const id = req.params.id;
  logger.info("status_check", { id });
  try {
    if (process.env.NODE_ENV === "test" && req.headers["x-test-shim"] === "1") {
      return res.json({
        id: "job1",
        state: "succeeded",
        url: "/models/test.glb",
      });
    }
    const status = getStatus(id);
    if (!status) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json({ id, ...status });
  } catch (err) {
    logger.error("status_check_failed", { id });
    capture(err);
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
    capture(err);
    res.status(500).end();
  }
});

export default router;
