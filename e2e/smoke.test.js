const { test, expect } = require('@playwright/test');

test('login flow', async ({ page }) => {
  await page.goto('/login.html');
  await expect(page).toHaveTitle(/Login/i);
});

test('dashboard loads', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('token', 'test-token'));
  await page.goto('/my_profile.html');
  await expect(page).toHaveTitle(/My Profile/i);
});

test('checkout flow', async ({ page }) => {
  await page.goto('/payment.html');
  await expect(page.locator('#submit-payment')).toBeVisible();
});
