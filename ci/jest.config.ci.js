const base = require("../jest.config.js");

module.exports = {
  ...base,
  retryTimes: 0,
  setupFilesAfterEnv: [
    ...(base.setupFilesAfterEnv || []),
    "<rootDir>/ci/flaky-telemetry-wrapper.js",
  ],
};
