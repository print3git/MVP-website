const { test, expect } = require('@playwright/test');

test('generate success shows confirmation', async ({ page }) => {
  await page.route('/api/generate', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ glb_url: '/models/test.glb' }),
    });
  });

  await page.goto('/generate.html');
  await page.fill('#gen-prompt', 'test');
  await page.click('#gen-submit');
  await expect(page.locator('#gen-success')).toHaveText(/Model generated!/);
  await expect(page.locator('canvas')).toBeVisible();
});

test('generate failure shows error message', async ({ page }) => {
  await page.route('/api/generate', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'SPARC3D_TOKEN is not set' }),
    });
  });

  await page.goto('/generate.html');
  await page.fill('#gen-prompt', 'test');
  await page.click('#gen-submit');
  await expect(page.locator('.text-red-500')).toHaveText(/SPARC3D_TOKEN is not set/);
});
