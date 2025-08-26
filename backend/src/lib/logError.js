const logger = require("../logger.js");
const { capture } = require("./logger");
function logError(...args) {
  if (process.env.NODE_ENV !== "test") {
    logger.error(...args);
  }
  const err =
    args[0] instanceof Error ? args[0] : new Error(args.map(String).join(" "));
  capture(err);
}
module.exports = { logError };
