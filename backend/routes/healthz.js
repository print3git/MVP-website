const express = require("express");
const pkg = require("../package.json");
const db = require("../db");

const router = express.Router();

function healthHandler(_req, res) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ status: "ok" }));
}

async function readyHandler(_req, res) {
  try {
    await db.query("SELECT 1");
    res.json({ ok: true, version: pkg.version });
  } catch {
    res.status(500).json({ ok: false, version: pkg.version });
  }
}

router.get("/healthz", healthHandler);

// Allow legacy /health endpoint for compatibility
router.get("/health", healthHandler);

router.get("/readyz", readyHandler);

module.exports = router;
module.exports.healthHandler = healthHandler;
module.exports.readyHandler = readyHandler;
