const { defineConfig } = require("@playwright/test");
// Global hooks to fail on browser console errors, uncaught exceptions, and network failures
require("./e2e/support/playwright-error-hooks-8dj8yveiflqu4id.js");
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

module.exports = defineConfig({
  testDir: "e2e",
  timeout: 120 * 1000,
  use: { baseURL, headless: true, ignoreHTTPSErrors: true },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "node scripts/dev-server.js",
        port: 3000,
        timeout: 120 * 1000,
        reuseExistingServer: true,
      },
});
