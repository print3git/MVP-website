import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /.*\.(spec|test)(\.[^.]+)?\.ts/,
  timeout: 30 * 1000,
  webServer: {
    command: "npx http-server . -p 3000",
    port: 3000,
    // Always reuse an existing server to avoid port-in-use errors during CI runs
    reuseExistingServer: true,
  },
  use: {
    browserName: "chromium",
    baseURL: "http://localhost:3000",
  },
});
