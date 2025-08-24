const { defineConfig } = require("@playwright/test");
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

module.exports = defineConfig({
  testDir: "tests/e2e",
  timeout: 30 * 1000,
  globalTimeout: 10 * 60 * 1000,
  retries: process.env.CI ? 2 : 0,
  workers: "50%",
  fullyParallel: false,
  testMatch: ["**/*.spec.*.ts"],
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
