import { Router } from "express";
import * as db from "../../db.js";
import { authRequired } from "../lib/auth";
import { logError } from "../lib/logError";
import { tinyPng } from "../lib/legacy/tinyPng";
import { createTimedCode } from "../../discountCodes";

const router = Router();

router.get("/api/referral-link", authRequired, async (req, res) => {
  try {
    const code = await db.getOrCreateReferralLink((req as any).user.id);
    res.json({ code });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch referral link" });
  }
});

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
  const cost = parseInt(req.body?.points, 10);
  if (Number.isNaN(cost)) {
    res.status(400).json({ error: "Invalid reward" });
    return;
  }
  try {
    const opt = await db.getRewardOption(cost);
    if (!opt) {
      res.status(400).json({ error: "Invalid reward" });
      return;
    }
    const current = await db.getRewardPoints((req as any).user.id);
    if (current < cost) {
      res.status(400).json({ error: "Insufficient points" });
      return;
    }
    await db.adjustRewardPoints((req as any).user.id, -cost);
    const code = await createTimedCode(opt.amount_cents, 168);
    res.json({ code });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to redeem reward" });
  }
});

router.get("/api/rewards/options", async (_req, res) => {
  try {
    const options = await db.getRewardOptions();
    res.json({ options });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch reward options" });
  }
});

router.get("/api/referral-click", async (req, res) => {
  const code = (req.query.code as string) || (req.body && req.body.code);
  if (!code) {
    res.status(400).json({ error: "Missing code" });
    return;
  }
  try {
    const referrer = await db.getUserIdForReferral(code);
    if (!referrer) {
      res.status(404).json({ error: "Invalid code" });
      return;
    }
    await db.insertReferralEvent(referrer, "click");
    res.json({ ok: true });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to record click" });
  }
});

router.post("/api/referral-signup", async (req, res) => {
  const { code } = req.body || {};
  if (!code) {
    res.status(400).json({ error: "Missing code" });
    return;
  }
  try {
    const userId = await db.getUserIdForReferral(code);
    if (!userId) {
      res.status(404).json({ error: "Invalid code" });
      return;
    }
    await db.insertReferralEvent(userId, "signup");
    await db.query("INSERT INTO incentives(user_id, code) VALUES($1,$2)", [
      userId,
      "referral_bonus",
    ]);
    await createTimedCode(300, 168);
    const reward = await createTimedCode(300, 168);
    res.json({ code: reward });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to process referral" });
  }
});

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
  const { status, current_period_start, current_period_end, customer_id, subscription_id, variant, price_cents } = req.body || {};
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
    await db.insertSubscriptionEvent((req as any).user.id, "join", variant, price_cents);
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

router.get("/api/orders/:id/referral-link", authRequired, async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await db.query("SELECT user_id FROM orders WHERE session_id=$1", [id]);
    if (!rows.length || rows[0].user_id !== (req as any).user.id) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    const code = await db.getOrCreateOrderReferralLink(id);
    res.json({ code });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch referral link" });
  }
});

router.get("/api/orders/:id/referral-qr", authRequired, async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await db.query("SELECT user_id FROM orders WHERE session_id=$1", [id]);
    if (!rows.length || rows[0].user_id !== (req as any).user.id) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    await db.getOrCreateOrderReferralLink(id);
    const png = tinyPng();
    res.type("png").send(png);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to generate QR code" });
  }
});

export default router;
