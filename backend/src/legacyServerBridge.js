const express = require("express");
const router = express.Router();

try {
  // Bridge to legacy backend/server.js handlers
  const legacyApp = require("../server.js");
  router.use(legacyApp);
} catch (err) {
  console.warn("Legacy server not found", err);
}

module.exports = router;
module.exports.default = router;
