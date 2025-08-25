import { Router } from "express";
import db from "../../db";
import { authRequired } from "../lib/auth";
import { logError } from "../lib/logError";

const router = Router();

router.get("/api/subscription", authRequired, async (req, res) => {
  try {
    const sub = await db.getSubscription((req as any).user.id);
    if (!sub) {
      res.json({ active: false });
      return;
    }
    res.json(sub);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch subscription" });
  }
});

router.post("/api/subscription", authRequired, async (req, res) => {
  const {
    status,
    current_period_start,
    current_period_end,
    customer_id,
    subscription_id,
    variant,
    price_cents,
  } = req.body;
  try {
    const sub = await db.upsertSubscription(
      (req as any).user.id,
      status || "active",
      current_period_start,
      current_period_end,
      customer_id,
      subscription_id,
    );
    await db.ensureCurrentWeekCredits((req as any).user.id, 2);
    await db.insertSubscriptionEvent(
      (req as any).user.id,
      "join",
      variant,
      price_cents,
    );
    res.json(sub);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to create subscription" });
  }
});

router.get("/api/subscription/credits", authRequired, async (req, res) => {
  try {
    await db.ensureCurrentWeekCredits((req as any).user.id, 2);
    const credits = await db.getCurrentWeekCredits((req as any).user.id);
    res.json({
      remaining: credits.total_credits - credits.used_credits,
      total: credits.total_credits,
    });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch credits" });
  }
});

export default router;

