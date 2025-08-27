import { Router } from "express";
import { emitter, getStatus } from "../queue/generation";

const router = Router();

router.get("/status/:id", (req, res) => {
  const status = getStatus(req.params.id);
  if (!status) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json({ id: req.params.id, ...status });
});

router.get("/progress/:id", (req, res) => {
  const id = req.params.id;
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
});

export default router;
