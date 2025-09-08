import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/astronaut-fallback",
  timeout: 30 * 1000,
  use: { browserName: "chromium", baseURL: "http://localhost:3000" },
  webServer: {
    command: "npm run serve",
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
