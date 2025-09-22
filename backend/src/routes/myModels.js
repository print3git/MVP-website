const { Router } = require("express");
const { authRequired, userIdFromAuth } = require("../lib/auth");
const logger = require("../logger.js");

const { getUserCreations } = require("../../db");

function parseNumericQuery(value, defaultValue) {
  if (Array.isArray(value)) {
    return parseNumericQuery(value[0], defaultValue);
  }
  if (typeof value === "string") {
    const parsed = parseInt(value, 10);
    if (!Number.isNaN(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return defaultValue;
}

const router = Router();

router.get("/", authRequired, async (req, res) => {
  const userId = userIdFromAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const query = req.query || {};
  const limit = parseNumericQuery(query.limit, 10);
  const offset = parseNumericQuery(query.offset, 0);

  try {
    const rows = await getUserCreations(userId, limit, offset);
    const models = (rows || []).map((row) => ({
      id: row.id,
      title: row.title ?? null,
      category: row.category ?? null,
      job_id: row.job_id,
      model_url: row.model_url,
      snapshot: row.snapshot ?? null,
      prompt: row.prompt ?? row.title ?? null,
    }));

    res.json(models);
  } catch (err) {
    logger.error("my_models_fetch_failed", err);
    res.status(500).json({ error: "unexpected_error" });
  }
});

module.exports = router;
module.exports.default = router;
