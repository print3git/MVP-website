import { Router } from "express";
import { authRequired, userIdFromAuth } from "../lib/auth";
import logger from "../logger.js";
import { capture } from "../lib/logger";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const db = require("../../db.js");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createTimedCode } = require("../../discountCodes.js");

const router = Router();

router.get("/rewards", authRequired, async (req, res) => {
  const userId = userIdFromAuth(req);
  try {
    const points = await db.getRewardPoints(userId);
    logger.info("reward_points_fetched", { userId, points });
    res.json({ points });
  } catch (err) {
    logger.error("reward_points_fetch_failed", { userId });
    capture(err);
    res.status(500).json({ error: "Failed to fetch rewards" });
  }
});
router.post("/rewards/redeem", authRequired, async (req, res) => {
  const cost = parseInt(req.body?.points, 10);
  if (Number.isNaN(cost)) {
    res.status(400).json({ error: "Invalid reward" });
    return;
  }
  const userId = userIdFromAuth(req);
  try {
    const opt = await db.getRewardOption(cost);
    if (!opt) {
      res.status(400).json({ error: "Invalid reward" });
      return;
    }
    const current = await db.getRewardPoints(userId);
    if (current < cost) {
      res.status(400).json({ error: "Insufficient points" });
      return;
    }
    await db.adjustRewardPoints(userId, -cost);
    const code = await createTimedCode(opt.amount_cents, 168);
    logger.info("reward_redeemed", { userId, cost });
    res.json({ code });
  } catch (err) {
    logger.error("reward_redeem_failed", { userId, cost });
    capture(err);
    res.status(500).json({ error: "Failed to redeem reward" });
  }
});

router.get("/rewards/options", async (_req, res) => {
  try {
    const options = await db.getRewardOptions();
    logger.info("reward_options_fetched", { count: options.length });
    res.json({ options });
  } catch (err) {
    logger.error("reward_options_fetch_failed");
    capture(err);
    res.status(500).json({ error: "Failed to fetch reward options" });
  }
});

export default router;

