// Re-export the main logger so CommonJS consumers receive the logger object
// instead of a `{ default: logger }` wrapper.
const logger = require("../../src/logger.js");
module.exports = logger;
