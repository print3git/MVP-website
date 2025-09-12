import { Router } from "express";
import config from "../../../config";

const router = Router();

router.get("/", (_req, res) => {
  res.json({ publishableKey: config.stripePublishable });
});

export default router;
