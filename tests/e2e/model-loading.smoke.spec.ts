import { test, expect } from '@playwright/test';
const pages = [{key:'index', url:'/index.html'}];
test.describe('3D model smoke', () => {
  for (const p of pages) {
    test(`loads model on ${p.url}`, async ({ page }) => {
      await page.goto(p.url, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__modelsLoaded && window.__modelsLoaded['index'], null, { timeout: 10000 });
      const primary = page.locator('[data-testid="primary-model"]');
      await expect(primary).toBeVisible();
      const canvas = primary.locator('[data-testid="model-canvas"], model-viewer');
      await expect(canvas).toBeVisible();
      // Accessibility hint
      const role = await canvas.getAttribute('role');
      const label = await canvas.getAttribute('aria-label');
      expect(role === 'img' || !!label).toBeTruthy();
    });
  }
});
