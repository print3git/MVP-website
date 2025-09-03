const { Router } = require("express");
const Stripe = require("stripe");
const db = require("../../db.js");
const config = require("../../config");
const { authRequired, authOptional } = require("../lib/auth");
const logger = require("../logger.js");
const { capture } = require("../lib/logger");
const isTest = () => process.env.NODE_ENV === "test";

const router = Router();
const realStripe = new Stripe(config.stripeKey, {
  apiVersion: "2022-11-15",
});
const stripe = isTest()
  ? require("../../tests/utils/stripeMock").stripe
  : realStripe;

router.get("/subscription", authRequired, async (req, res) => {
  try {
    logger.info("Fetching subscription", { userId: req.user.id });
    const sub = await db.getSubscription(req.user.id);
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
  } = req.body || {};
  try {
    logger.info("Creating subscription", { userId: req.user.id });
    const sub = await db.upsertSubscription(
      req.user.id,
      status || "active",
      current_period_start,
      current_period_end,
      customer_id,
      subscription_id,
    );
    await db.ensureCurrentWeekCredits(req.user.id, 2);
    await db.insertSubscriptionEvent(req.user.id, "join", variant, price_cents);
    res.json(sub);
  } catch (err) {
    logger.error(err);
    capture(err);
    res.status(500).json({ error: "Failed to create subscription" });
  }
});

router.delete("/subscription", authRequired, async (req, res) => {
  try {
    logger.info("Deleting subscription", { userId: req.user.id });
    const sub = await db.cancelSubscription(req.user.id);
    res.json(sub);
  } catch (err) {
    logger.error(err);
    capture(err);
    res.status(500).json({ error: "Failed to delete subscription" });
  }
});

router.post("/subscription/portal", authRequired, async (req, res) => {
  try {
    const sub = await db.getSubscription(req.user.id);
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
    await db.ensureCurrentWeekCredits(req.user.id, 2);
    const credits = await db.getCurrentWeekCredits(req.user.id);
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
    await db.ensureCurrentWeekCredits(req.user.id, 2);
    const [sub, credits, months] = await Promise.all([
      db.getSubscription(req.user.id),
      db.getCurrentWeekCredits(req.user.id),
      db.getSubscriptionDurationMonths(req.user.id),
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

function adminCheck(req, res, next) {
  authOptional(req, res, () => {
    if (!req.user || req.user.isAdmin !== true) {
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

module.exports = router;
module.exports.default = router;
