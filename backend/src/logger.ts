// Re-export the root logger using CommonJS to avoid ESM default wrappers
const logger = require("../../src/logger.js");
module.exports = logger;
