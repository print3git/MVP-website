import { test, expect } from '@playwright/test';

test('generate workflow', async ({ page }) => {
  await page.goto('/index.html');
  await page.fill('#promptInput', 'smoke test');
  await page.click('#submit-button');
  await page.waitForFunction(() => {
    const url = localStorage.getItem('print3Model');
    return url && !url.includes('bag.glb');
  }, null, { timeout: 120000 });
  const modelUrl = await page.evaluate(() => localStorage.getItem('print3Model'));
  await expect(page.locator('#viewer')).toHaveAttribute('src', modelUrl || '');
});
