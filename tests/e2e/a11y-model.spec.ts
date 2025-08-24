import { test, expect } from "@playwright/test";

test("primary model has a descriptive label", async ({ page }) => {
  await page.goto("/index.html");
  const target = page
    .locator(
      '[data-testid="primary-model"] [data-testid="model-canvas"], [data-testid="primary-model"] model-viewer',
    )
    .first();
  const label = await target.getAttribute("aria-label");
  expect(label && label.length >= 3).toBeTruthy();
});
