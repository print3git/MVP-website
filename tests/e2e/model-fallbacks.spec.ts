import { test, expect } from "@playwright/test";

test("missing model shows fallback UI", async ({ page }) => {
  await page.route(/\.glb($|\?)/, (route) => route.abort()); // simulate 404
  await page.goto("/index.html");
  const primary = page.locator('[data-testid="primary-model"]');
  // App-specific fallback: tweak selector/text if your UI differs
  await expect(
    primary.locator(
      '[data-testid="model-fallback"], text=/model not available/i',
    ),
  ).toBeVisible();
});
