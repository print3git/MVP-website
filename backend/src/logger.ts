// Re-export the CommonJS logger helper so `require("../src/logger")` returns
// the logger instance directly instead of an ES module object with a `default`
// property. This avoids `logger.info is not a function` errors in tests.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const logger = require("../../src/logger.js");
module.exports = logger;
