const { defineConfig } = require("@playwright/test");
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

module.exports = defineConfig({
  testDir: "e2e",
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
