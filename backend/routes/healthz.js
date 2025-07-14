const express = require("express");

const router = express.Router();

router.get("/healthz", (req, res) => {
  res.json({ status: "ok" });
});

// Allow legacy /health endpoint for compatibility
router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

module.exports = router;
