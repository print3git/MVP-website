import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/astronaut-fallback",
  timeout: 30 * 1000,
  use: {
    browserName: "chromium",
    baseURL: "http://localhost:3000",
  },
});
