const { defineConfig } = require("@playwright/test");
const path = require("path");

module.exports = defineConfig({
  testDir: ".",
  timeout: 120 * 1000,
  use: { headless: true },
  webServer: {
    command: `node ${path.join(__dirname, "../../scripts/dev-server.js")}`,
    port: 3000,
    timeout: 120 * 1000,
    reuseExistingServer: true,
  },
});
