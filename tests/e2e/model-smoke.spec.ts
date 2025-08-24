import { test, expect } from "@playwright/test";
const pages = [
  { key: "index", url: "/index.html" },
  { key: "payment", url: "/payment.html" },
];
test.describe("GLB smoke", () => {
  for (const p of pages) {
    test(`${p.url} loads model`, async ({ page }) => {
      await page.goto(p.url, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(
        (k) => !!(window as any).__modelsLoaded?.[k],
        p.key,
        { timeout: 15000 },
      );
      const primary = page.locator('[data-testid="primary-model"]');
      await expect(primary).toBeVisible();
      const target = primary
        .locator('[data-testid="model-viewer"], #model-canvas, canvas')
        .first();
      await expect(target).toBeVisible();
      const role = await target.getAttribute("role");
      const label = await target.getAttribute("aria-label");
      expect(role === "img" || !!label).toBeTruthy();
    });
  }
});
