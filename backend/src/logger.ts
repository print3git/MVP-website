// Re-export CommonJS logger from the repo root so Jest receives
// a plain object with info/warn/error methods instead of an ES module.
import logger from "../../src/logger.js";
export default logger;
module.exports = logger;
