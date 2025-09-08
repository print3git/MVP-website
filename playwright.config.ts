import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/astronaut-fallback",
  timeout: 30 * 1000,
  use: {
    browserName: "chromium",
    // Point Playwright to the backend server so API routes are available
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3001",
  },
});
