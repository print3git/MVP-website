const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: 'e2e',
  use: { baseURL: 'http://localhost:3000', headless: true },
  webServer: {
    command: 'npx http-server -c-1 -p 3000',
    port: 3000,
    timeout: 120 * 1000,
  },
});
