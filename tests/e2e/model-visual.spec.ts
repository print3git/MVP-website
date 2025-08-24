import { test, expect } from "@playwright/test";

test("index visual snapshot", async ({ page }) => {
  await page.goto("/index.html");
  await page.waitForFunction(() => (window as any).__modelsLoaded?.index);
  await page.setViewportSize({ width: 600, height: 400 });
  const shot = await page.locator('[data-testid="primary-model"]').screenshot();
  expect(shot).toMatchSnapshot("index-model.png", { threshold: 0.05 });
});

test("payment visual snapshot", async ({ page }) => {
  await page.goto("/payment.html");
  await page.waitForFunction(() => (window as any).__modelsLoaded?.payment);
  await page.setViewportSize({ width: 600, height: 400 });
  const shot = await page.locator('[data-testid="primary-model"]').screenshot();
  expect(shot).toMatchSnapshot("payment-model.png", { threshold: 0.05 });
});
