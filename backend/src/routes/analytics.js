const { Router } = require("express");
// Use the module without an explicit extension so Jest's moduleNameMapper
// and manual mocks for "../../db" take effect consistently during tests.
// Requiring "../../db.js" bypasses those mocks, causing the real database
// module to load and resulting in uncalled mock functions in tests.
// Allow tests to inject a mocked DB via global.__db. If not provided, fall back
// to requiring the real database module.
// eslint-disable-next-line no-undef
const db = global.__db || require("../../db");

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
  } catch {
    /* TODO: log insertAdClick failure */
  }
  res.json({ ok: true });
});

router.post("/api/track/cart", (req, res) => {
  const { sessionId, modelId, subreddit } = req.body || {};
  store.cartEvents.push({ sessionId, modelId, subreddit });
  try {
    db.insertCartEvent && db.insertCartEvent(sessionId, modelId, subreddit);
  } catch {
    /* TODO: log insertCartEvent failure */
  }
  res.json({ ok: true });
});

router.post("/api/track/checkout", (req, res) => {
  const { sessionId, subreddit, step } = req.body || {};
  store.checkoutEvents.push({ sessionId, subreddit, step });
  try {
    db.insertCheckoutEvent &&
      db.insertCheckoutEvent(sessionId, subreddit, step);
  } catch {
    /* TODO: log insertCheckoutEvent failure */
  }
  res.json({ ok: true });
});

router.post("/api/track/share", (req, res) => {
  const { shareId, network } = req.body || {};
  store.shareEvents.push({ shareId, network });
  try {
    db.insertShareEvent && db.insertShareEvent(shareId, network);
  } catch {
    /* TODO: log insertShareEvent failure */
  }
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
  } catch {
    /* TODO: log insertPageView failure */
  }
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
