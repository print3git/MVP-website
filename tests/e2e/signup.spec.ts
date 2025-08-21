import { test, expect } from '@playwright/test';

test.describe.configure({ retries: 2 });

test('signup page renders', async ({ page }) => {
  await page.goto('/signup.html');
  await expect(page.getByRole('heading', { name: /sign up/i })).toBeVisible();
});

test('non-existent page returns 404', async ({ page }) => {
  const res = await page.goto('/does-not-exist.html');
  expect(res?.status()).toBe(404);
});
