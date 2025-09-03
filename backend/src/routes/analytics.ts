import { Router } from "express";
import * as db from "../../db";
import logger from "../logger";
import { capture } from "../lib/logger";

const router = Router();

const store = {
  adClicks: [] as Array<{ subreddit: string; sessionId: string }>,
  cartEvents: [] as Array<{
    sessionId: string;
    modelId: string;
    subreddit?: string;
  }>,
  checkoutEvents: [] as Array<{
    sessionId: string;
    subreddit?: string;
    step?: string;
  }>,
  shareEvents: [] as Array<{ shareId: string; network?: string }>,
  pageViews: [] as Array<{
    sessionId: string;
    subreddit?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  }>,
};

router.post("/api/track/ad-click", (req, res) => {
  const { subreddit, sessionId } = req.body ?? {};
  store.adClicks.push({ subreddit, sessionId });
  logger.info("track_ad_click", { subreddit, sessionId });
  try {
    // @ts-ignore
    db.insertAdClick?.(subreddit, sessionId);
  } catch (err) {
    logger.error("track_ad_click_failed", { subreddit, sessionId });
    capture(err);
  }
  res.json({ ok: true });
});

router.post("/api/track/cart", (req, res) => {
  const { sessionId, modelId, subreddit } = req.body ?? {};
  store.cartEvents.push({ sessionId, modelId, subreddit });
  logger.info("track_cart_event", { sessionId, modelId, subreddit });
  try {
    // @ts-ignore
    db.insertCartEvent?.(sessionId, modelId, subreddit);
  } catch (err) {
    logger.error("track_cart_event_failed", { sessionId, modelId, subreddit });
    capture(err);
  }
  res.json({ ok: true });
});

router.post("/api/track/checkout", (req, res) => {
  const { sessionId, subreddit, step } = req.body ?? {};
  store.checkoutEvents.push({ sessionId, subreddit, step });
  logger.info("track_checkout_event", { sessionId, subreddit, step });
  try {
    // @ts-ignore
    db.insertCheckoutEvent?.(sessionId, subreddit, step);
  } catch (err) {
    logger.error("track_checkout_event_failed", { sessionId, subreddit, step });
    capture(err);
  }
  res.json({ ok: true });
});

router.post("/api/track/share", (req, res) => {
  const { shareId, network } = req.body ?? {};
  store.shareEvents.push({ shareId, network });
  logger.info("track_share_event", { shareId, network });
  try {
    // @ts-ignore
    db.insertShareEvent?.(shareId, network);
  } catch (err) {
    logger.error("track_share_event_failed", { shareId, network });
    capture(err);
  }
  res.json({ ok: true });
});

router.post("/api/track/page", (req, res) => {
  const { sessionId, subreddit, utmSource, utmMedium, utmCampaign } =
    req.body ?? {};
  store.pageViews.push({
    sessionId,
    subreddit,
    utmSource,
    utmMedium,
    utmCampaign,
  });
  logger.info("track_page_view", {
    sessionId,
    subreddit,
    utmSource,
    utmMedium,
    utmCampaign,
  });
  try {
    // @ts-ignore
    db.insertPageView?.(
      sessionId,
      subreddit,
      utmSource,
      utmMedium,
      utmCampaign,
    );
  } catch (err) {
    logger.error("track_page_view_failed", {
      sessionId,
      subreddit,
      utmSource,
      utmMedium,
      utmCampaign,
    });
    capture(err);
  }
  res.json({ ok: true });
});

router.get("/api/metrics/conversion", async (_req, res) => {
  logger.info("metrics_conversion_requested");
  try {
    // @ts-ignore
    const data = await db.getConversionMetrics?.();
    res.json(data ?? []);
  } catch (err) {
    logger.error("metrics_conversion_failed");
    capture(err);
    res.json([]);
  }
});

router.get("/api/metrics/profit", async (_req, res) => {
  logger.info("metrics_profit_requested");
  try {
    // @ts-ignore
    const data = await db.getProfitMetrics?.();
    res.json(data ?? []);
  } catch (err) {
    logger.error("metrics_profit_failed");
    capture(err);
    res.json([]);
  }
});

router.get("/api/metrics/business-intel", async (_req, res) => {
  logger.info("metrics_business_intel_requested");
  try {
    // @ts-ignore
    const data = await db.getBusinessIntelligenceMetrics?.();
    res.json(data ?? []);
  } catch (err) {
    logger.error("metrics_business_intel_failed");
    capture(err);
    res.json([]);
  }
});

router.get("/api/metrics/daily-profit", async (_req, res) => {
  logger.info("metrics_daily_profit_requested");
  try {
    // @ts-ignore
    const data = await db.getDailyProfitSeries?.();
    res.json(data ?? []);
  } catch (err) {
    logger.error("metrics_daily_profit_failed");
    capture(err);
    res.json([]);
  }
});

router.get("/api/metrics/daily-capacity", async (_req, res) => {
  logger.info("metrics_daily_capacity_requested");
  try {
    // @ts-ignore
    const data = await db.getDailyCapacityUtilizationSeries?.();
    res.json(data ?? []);
  } catch (err) {
    logger.error("metrics_daily_capacity_failed");
    capture(err);
    res.json([]);
  }
});

router.get("/api/metrics/demand-forecast", async (_req, res) => {
  logger.info("metrics_demand_forecast_requested");
  try {
    // @ts-ignore
    const data = await db.getDemandForecast?.();
    res.json(data ?? []);
  } catch (err) {
    logger.error("metrics_demand_forecast_failed");
    capture(err);
    res.json([]);
  }
});

router.get("/api/metrics/marginal-cac", async (_req, res) => {
  logger.info("metrics_marginal_cac_requested");
  try {
    // @ts-ignore
    const data = await db.getMarginalCacMetrics?.();
    res.json(data ?? []);
  } catch (err) {
    logger.error("metrics_marginal_cac_failed");
    capture(err);
    res.json([]);
  }
});

export default router;
