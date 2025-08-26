import { Router } from "express";
import * as db from "../../db.js";

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
  try {
    // @ts-ignore
    db.insertAdClick?.(subreddit, sessionId);
  } catch {}
  res.json({ ok: true });
});

router.post("/api/track/cart", (req, res) => {
  const { sessionId, modelId, subreddit } = req.body ?? {};
  store.cartEvents.push({ sessionId, modelId, subreddit });
  try {
    // @ts-ignore
    db.insertCartEvent?.(sessionId, modelId, subreddit);
  } catch {}
  res.json({ ok: true });
});

router.post("/api/track/checkout", (req, res) => {
  const { sessionId, subreddit, step } = req.body ?? {};
  store.checkoutEvents.push({ sessionId, subreddit, step });
  try {
    // @ts-ignore
    db.insertCheckoutEvent?.(sessionId, subreddit, step);
  } catch {}
  res.json({ ok: true });
});

router.post("/api/track/share", (req, res) => {
  const { shareId, network } = req.body ?? {};
  store.shareEvents.push({ shareId, network });
  try {
    // @ts-ignore
    db.insertShareEvent?.(shareId, network);
  } catch {}
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
  try {
    // @ts-ignore
    db.insertPageView?.(
      sessionId,
      subreddit,
      utmSource,
      utmMedium,
      utmCampaign,
    );
  } catch {}
  res.json({ ok: true });
});

router.get("/api/metrics/conversion", async (_req, res) => {
  try {
    // @ts-ignore
    const data = await db.getConversionMetrics?.();
    res.json(data ?? []);
  } catch {
    res.json([]);
  }
});

router.get("/api/metrics/profit", async (_req, res) => {
  try {
    // @ts-ignore
    const data = await db.getProfitMetrics?.();
    res.json(data ?? []);
  } catch {
    res.json([]);
  }
});

router.get("/api/metrics/business-intel", async (_req, res) => {
  try {
    // @ts-ignore
    const data = await db.getBusinessIntelligenceMetrics?.();
    res.json(data ?? []);
  } catch {
    res.json([]);
  }
});

router.get("/api/metrics/daily-profit", async (_req, res) => {
  try {
    // @ts-ignore
    const data = await db.getDailyProfitSeries?.();
    res.json(data ?? []);
  } catch {
    res.json([]);
  }
});

router.get("/api/metrics/daily-capacity", async (_req, res) => {
  try {
    // @ts-ignore
    const data = await db.getDailyCapacityUtilizationSeries?.();
    res.json(data ?? []);
  } catch {
    res.json([]);
  }
});

router.get("/api/metrics/demand-forecast", async (_req, res) => {
  try {
    // @ts-ignore
    const data = await db.getDemandForecast?.();
    res.json(data ?? []);
  } catch {
    res.json([]);
  }
});

router.get("/api/metrics/marginal-cac", async (_req, res) => {
  try {
    // @ts-ignore
    const data = await db.getMarginalCacMetrics?.();
    res.json(data ?? []);
  } catch {
    res.json([]);
  }
});

export default router;
