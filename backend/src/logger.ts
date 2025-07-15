// Re-export the root logger using CommonJS to avoid ESM parsing issues in Jest
module.exports = require("../../src/logger.js");
