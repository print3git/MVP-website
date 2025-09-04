const logger = require("../logger.js");
const { capture } = require("../lib/logger");

function errorHandler(err, req, res, _next) {
  const context = {
    method: req.method,
    url: req.originalUrl,
    stack: err.stack,
  };
  try {
    logger.error("Error handling request", context);
  } catch {
    // ignore logging failures
  }
  capture(err);
  res.status(500).json({ error: "Internal Server Error" });
}

module.exports = errorHandler;
module.exports.default = errorHandler;
