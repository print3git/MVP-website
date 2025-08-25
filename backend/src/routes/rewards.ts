import { Router } from "express";
import db from "../../db";
import { createTimedCode } from "../../discountCodes";
import { authRequired } from "../lib/auth";
import { logError } from "../lib/logError";

const router = Router();

router.get("/api/rewards", authRequired, async (req, res) => {
  try {
    const points = await db.getRewardPoints((req as any).user.id);
    res.json({ points });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch rewards" });
  }
});

router.post("/api/rewards/redeem", authRequired, async (req, res) => {
  const cost = parseInt(req.body.points, 10);
  let discount = null as null | number;
  try {
    const opt = await db.getRewardOption(cost);
    discount = opt ? opt.amount_cents : null;
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch reward options" });
    return;
  }
  if (!discount) {
    res.status(400).json({ error: "Invalid reward" });
    return;
  }
  try {
    const current = await db.getRewardPoints((req as any).user.id);
    if (current < cost) {
      res.status(400).json({ error: "Insufficient points" });
      return;
    }
    await db.adjustRewardPoints((req as any).user.id, -cost);
    const code = await createTimedCode(discount, 168);
    res.json({ code });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to redeem reward" });
  }
});

export default router;

