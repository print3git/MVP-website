import { test, expect } from "@playwright/test";

test("index: missing model shows fallback UI", async ({ page }) => {
  await page.route(/\.glb(\?|$)/i, (r) => r.abort()); // simulate failure
  await page.goto("/index.html");
  const fallback = page
    .getByTestId("model-fallback")
    .or(page.getByText(/model not available/i));
  await expect(fallback).toBeVisible();
});
