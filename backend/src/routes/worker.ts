import { Router } from "express";
import { isReady } from "../../queue/printWorker";

const router = Router();

router.get("/worker/health", (_req, res) => {
  res.json({ ok: true, ready: isReady() });
});

export default router;

