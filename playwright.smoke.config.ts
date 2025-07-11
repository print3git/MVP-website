import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/ui',
  use: {
    baseURL: process.env.PREVIEW_URL,
    headless: true,
  },
});
