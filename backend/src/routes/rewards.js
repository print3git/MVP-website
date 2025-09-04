const { Router } = require("express");
const db = require("../../db");
const { createTimedCode } = require("../../discountCodes");
const { authRequired } = require("../lib/auth");
const { logError } = require("../lib/logError");

const router = Router();

router.get("/rewards", authRequired, async (req, res) => {
  try {
    const points = await db.getRewardPoints(req.user.id);
    res.json({ points });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch rewards" });
  }
});

router.post("/rewards/redeem", authRequired, async (req, res) => {
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
    const current = await db.getRewardPoints(req.user.id);
    if (current < cost) {
      res.status(400).json({ error: "Insufficient points" });
      return;
    }
    await db.adjustRewardPoints(req.user.id, -cost);
    const code = await createTimedCode(opt.amount_cents, 168);
    res.json({ code });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to redeem reward" });
  }
});

router.get("/rewards/options", async (_req, res) => {
  try {
    const options = await db.getRewardOptions();
    res.json({ options });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch reward options" });
  }
});

module.exports = router;
module.exports.default = router;
