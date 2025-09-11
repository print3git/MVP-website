import { test, expect } from "@playwright/test";

test("primary model has a descriptive label", async ({ page }) => {
  await page.goto("/index.html");
  const target = page.locator("#glb-viewer, model-viewer").first();
  const label = await target.getAttribute("aria-label");
  expect(label && label.length >= 3).toBeTruthy();
});
