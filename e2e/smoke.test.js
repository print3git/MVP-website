if (require.main === module) {
  console.error('This file is a Playwright test. Run it with "npx playwright test e2e/smoke.test.js".');
  process.exit(1);
}

const { test, expect } = require('@playwright/test');
const { percySnapshot } = require('@percy/playwright');

// Simple smoke tests for core pages

test('home page accessible via root path', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/print2/i);
  await percySnapshot(page, 'home root');
});

test('login flow', async ({ page }) => {
  await page.goto('/login.html');
  await expect(page).toHaveTitle(/Login/i);
  await percySnapshot(page, 'login flow');
});

test('dashboard loads', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('token', 'test-token'));
  const response = await page.goto('/my_profile.html');
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/My Profile/i);
  await percySnapshot(page, 'dashboard loads');
});

test('checkout flow', async ({ page }) => {
  await page.goto('/payment.html');
  await expect(page.locator('#submit-payment')).toBeVisible();
  await percySnapshot(page, 'checkout flow');
});

test('model generator page', async ({ page }) => {
  await page.goto('/index.html');
  // <model-viewer> loads asynchronously; wait for the custom element
  // definition and for the model to finish loading before checking visibility.
  await page.waitForFunction(() => window.customElements.get('model-viewer'));
  await page.waitForSelector('#viewer', { state: 'visible', timeout: 15000 });
  await expect(page.locator('#viewer')).toBeVisible();
});

test.skip('generate flow', async ({ page }) => {
  await page.goto('/generate.html');
  // The form is rendered via React after scripts load, so wait for the prompt
  // field before interacting with it. The CDN requests can be slow under CI,
  // so allow extra time for the form to appear.
  await page.waitForSelector('#gen-prompt', { state: 'visible', timeout: 20000 });
  await page.fill('#gen-prompt', 'test');
  await page.click('#gen-submit');
  await expect(page.locator('canvas')).toBeVisible();
});
