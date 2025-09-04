import { test, expect } from '@playwright/test';

test('homepage renders', async ({ page }) => {
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveTitle(/print/i);
  await expect(page.locator('body')).toBeVisible();
});
