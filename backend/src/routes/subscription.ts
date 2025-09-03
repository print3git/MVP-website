import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import Stripe from "stripe";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const db = require("../../db.js");
import config from "../../config";
import { authRequired, authOptional } from "../lib/auth";
import logger from "../logger";
import { capture } from "../lib/logger";

const router = Router();
const stripe = new Stripe(config.stripeKey, {
  apiVersion: "2022-11-15",
});

router.get("/subscription", authRequired, async (req, res) => {
  try {
    logger.info("Fetching subscription", { userId: (req as any).user.id });
    const sub = await db.getSubscription((req as any).user.id);
    if (!sub) {
      res.json({ active: false });
      return;
    }
    res.json(sub);
  } catch (err) {
    logger.error(err);
    capture(err);
    res.status(500).json({ error: "Failed to fetch subscription" });
  }
});

router.post("/subscription", authRequired, async (req, res) => {
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
    logger.info("Creating subscription", { userId: (req as any).user.id });
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
    logger.error(err);
    capture(err);
    res.status(500).json({ error: "Failed to create subscription" });
  }
});

router.delete("/subscription", authRequired, async (req, res) => {
  try {
    logger.info("Deleting subscription", { userId: (req as any).user.id });
    const sub = await db.cancelSubscription((req as any).user.id);
    res.json(sub);
  } catch (err) {
    logger.error(err);
    capture(err);
    res.status(500).json({ error: "Failed to delete subscription" });
  }
});

router.post("/subscription/portal", authRequired, async (req, res) => {
  try {
    const sub = await db.getSubscription((req as any).user.id);
    if (!sub || !sub.stripe_customer_id) {
      res.status(404).json({ error: "Subscription not found" });
      return;
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${req.headers.origin}/my_profile.html`,
    });
    res.json({ url: session.url });
  } catch (err) {
    logger.error(err);
    capture(err);
    res.status(500).json({ error: "Failed to create portal session" });
  }
});

router.get("/subscription/credits", authRequired, async (req, res) => {
  try {
    await db.ensureCurrentWeekCredits((req as any).user.id, 2);
    const credits = await db.getCurrentWeekCredits((req as any).user.id);
    res.json({
      remaining: credits.total_credits - credits.used_credits,
      total: credits.total_credits,
    });
  } catch (err) {
    logger.error(err);
    capture(err);
    res.status(500).json({ error: "Failed to fetch credits" });
  }
});

router.get("/subscription/summary", authRequired, async (req, res) => {
  try {
    await db.ensureCurrentWeekCredits((req as any).user.id, 2);
    const [sub, credits, months] = await Promise.all([
      db.getSubscription((req as any).user.id),
      db.getCurrentWeekCredits((req as any).user.id),
      db.getSubscriptionDurationMonths((req as any).user.id),
    ]);
    const milestone = months >= 12 ? 12 : months >= 6 ? 6 : months >= 3 ? 3 : 0;
    res.json({
      subscription: sub || { active: false },
      credits: {
        remaining: credits.total_credits - credits.used_credits,
        total: credits.total_credits,
      },
      months_subscribed: months,
      milestone,
    });
  } catch (err) {
    logger.error(err);
    capture(err);
    res.status(500).json({ error: "Failed to fetch subscription summary" });
  }
});

function adminCheck(req: Request, res: Response, next: NextFunction): void {
  authOptional(req, res, () => {
    if (!(req as any).user || (req as any).user.isAdmin !== true) {
      res.status(401).json({ error: "Admin token required" });
      return;
    }
    next();
  });
}

router.get("/admin/subscription-metrics", adminCheck, async (_req, res) => {
  try {
    const metrics = await db.getSubscriptionMetrics();
    res.json(metrics);
  } catch (err) {
    logger.error(err);
    capture(err);
    res.status(500).json({ error: "Failed to fetch metrics" });
  }
});

export default router;
