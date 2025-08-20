const express = require("express");

const router = express.Router();

router.get("/healthz", (_req, res) => {
  res.json({ ok: true });
});

// Allow legacy /health endpoint for compatibility
router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

module.exports = router;
