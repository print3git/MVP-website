const { Router } = require("express");
const db = require("../../db.js");

const router = Router();

const store = {
  adClicks: [],
  cartEvents: [],
  checkoutEvents: [],
  shareEvents: [],
  pageViews: [],
};

router.post("/api/track/ad-click", (req, res) => {
  const { subreddit, sessionId } = req.body || {};
  store.adClicks.push({ subreddit, sessionId });
  try {
    db.insertAdClick && db.insertAdClick(subreddit, sessionId);
  } catch {}
  res.json({ ok: true });
});

router.post("/api/track/cart", (req, res) => {
  const { sessionId, modelId, subreddit } = req.body || {};
  store.cartEvents.push({ sessionId, modelId, subreddit });
  try {
    db.insertCartEvent && db.insertCartEvent(sessionId, modelId, subreddit);
  } catch {}
  res.json({ ok: true });
});

router.post("/api/track/checkout", (req, res) => {
  const { sessionId, subreddit, step } = req.body || {};
  store.checkoutEvents.push({ sessionId, subreddit, step });
  try {
    db.insertCheckoutEvent &&
      db.insertCheckoutEvent(sessionId, subreddit, step);
  } catch {}
  res.json({ ok: true });
});

router.post("/api/track/share", (req, res) => {
  const { shareId, network } = req.body || {};
  store.shareEvents.push({ shareId, network });
  try {
    db.insertShareEvent && db.insertShareEvent(shareId, network);
  } catch {}
  res.json({ ok: true });
});

router.post("/api/track/page", (req, res) => {
  const { sessionId, subreddit, utmSource, utmMedium, utmCampaign } =
    req.body || {};
  store.pageViews.push({
    sessionId,
    subreddit,
    utmSource,
    utmMedium,
    utmCampaign,
  });
  try {
    db.insertPageView &&
      db.insertPageView(
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
    const data = db.getConversionMetrics ? await db.getConversionMetrics() : [];
    res.json(data || []);
  } catch {
    res.json([]);
  }
});

router.get("/api/metrics/profit", async (_req, res) => {
  try {
    const data = db.getProfitMetrics ? await db.getProfitMetrics() : [];
    res.json(data || []);
  } catch {
    res.json([]);
  }
});

router.get("/api/metrics/business-intel", async (_req, res) => {
  try {
    const data = db.getBusinessIntelligenceMetrics
      ? await db.getBusinessIntelligenceMetrics()
      : [];
    res.json(data || []);
  } catch {
    res.json([]);
  }
});

router.get("/api/metrics/daily-profit", async (_req, res) => {
  try {
    const data = db.getDailyProfitSeries ? await db.getDailyProfitSeries() : [];
    res.json(data || []);
  } catch {
    res.json([]);
  }
});

router.get("/api/metrics/daily-capacity", async (_req, res) => {
  try {
    const data = db.getDailyCapacityUtilizationSeries
      ? await db.getDailyCapacityUtilizationSeries()
      : [];
    res.json(data || []);
  } catch {
    res.json([]);
  }
});

router.get("/api/metrics/demand-forecast", async (_req, res) => {
  try {
    const data = db.getDemandForecast ? await db.getDemandForecast() : [];
    res.json(data || []);
  } catch {
    res.json([]);
  }
});

router.get("/api/metrics/marginal-cac", async (_req, res) => {
  try {
    const data = db.getMarginalCacMetrics
      ? await db.getMarginalCacMetrics()
      : [];
    res.json(data || []);
  } catch {
    res.json([]);
  }
});

module.exports = router;
