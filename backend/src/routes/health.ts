import { Router } from "express";
import pkg from "../../package.json";

const router = Router();

router.get("/healthz", (_req, res) => {
  res.json({ ok: true, version: pkg.version });
});

export default router;
