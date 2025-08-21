import { defineConfig } from '@playwright/test';
import path from 'path';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: path.join(__dirname, 'e2e'),
  timeout: 60_000,
  globalTimeout: 10 * 60 * 1000,
  reporter: [
    ['list'],
    ['junit', { outputFile: 'tests/.artifacts/e2e-junit.xml' }],
    ['html', { outputFolder: 'tests/.artifacts/playwright-report', open: 'never' }],
  ],
  use: {
    baseURL,
    headless: true,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'node ../scripts/dev-server.js',
        port: 3000,
        timeout: 120 * 1000,
        reuseExistingServer: true,
      },
});
