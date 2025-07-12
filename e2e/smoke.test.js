if (require.main === module) {
  console.error('This file is a Playwright test. Run it with "npx playwright test e2e/smoke.test.js".');
  process.exit(1);
}

const { test, expect } = require('@playwright/test');
test.use({
  baseURL: 'http://localhost:3000',
  timeout: 60000,
});
const { percySnapshot } = require('@percy/playwright');

// Simple smoke tests for core pages

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
  // Skip if the CDN hosting <model-viewer> is unreachable.
  try {
    const resp = await page.request.get(
      'https://cdn.jsdelivr.net/npm/@google/model-viewer@1.12.0/dist/model-viewer.min.js',
    );
    if (resp.status() >= 400) {
      test.skip(true, 'cdn.jsdelivr.net unreachable');
    }
  } catch {
    test.skip(true, 'cdn.jsdelivr.net unreachable');
  }

  await page.goto('/index.html');
  // <model-viewer> loads asynchronously; wait for the custom element
  // definition and for the model to finish loading before checking visibility.
  await page.waitForFunction(() => window.customElements.get('model-viewer'));
  // Allow extra time for the viewer to load when the CDN script fails and the
  // page falls back to the local copy.
  await page.waitForSelector('#viewer', { state: 'visible', timeout: 30000 });
  await expect(page.locator('#viewer')).toBeVisible();
});

test('generate flow', async ({ page }) => {
  // Skip if esm.sh is unreachable since the React bundle won't load.
  try {
    const resp = await page.request.get('https://esm.sh');
    if (resp.status() >= 400) {
      test.skip(true, 'esm.sh unreachable');
    }
  } catch {
    test.skip(true, 'esm.sh unreachable');
  }

  // Skip if the CDN hosting <model-viewer> is unreachable.
  try {
    const resp = await page.request.get(
      'https://cdn.jsdelivr.net/npm/@google/model-viewer@1.12.0/dist/model-viewer.min.js',
    );
    if (resp.status() >= 400) {
      test.skip(true, 'cdn.jsdelivr.net unreachable');
    }
  } catch {
    test.skip(true, 'cdn.jsdelivr.net unreachable');
  }

  await page.goto('/generate.html');
  // The form is rendered via React after scripts load, so wait for the prompt
  // field before interacting with it. Give the page up to 30s to load the
  // component to avoid flaky timeouts on slow systems.
  await page.waitForSelector('#gen-prompt', { state: 'visible', timeout: 30000 });
  await page.fill('#gen-prompt', 'test');
  await page.click('#gen-submit');
  await expect(page.locator('canvas')).toBeVisible({ timeout: 30000 });
});
