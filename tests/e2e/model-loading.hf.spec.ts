import { test, expect } from "@playwright/test";

const pages = [
  { key: "index", url: "/index.html" },
  { key: "addons", url: "/addons.html" },
  { key: "competitions", url: "/competitions.html" },
  { key: "library", url: "/library.html" },
  { key: "marketplace", url: "/marketplace.html" },
  { key: "payment", url: "/payment.html" },
];

test.describe("3D model high\u2011fidelity checks", () => {
  for (const p of pages) {
    test(`${p.url} renders and is accessible`, async ({ page }) => {
      await page.goto(p.url, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(
        (k) => window.__modelsLoaded && window.__modelsLoaded[k],
        p.key,
        { timeout: 15000 },
      );

      const primary = page.locator('[data-testid="primary-model"]');
      await expect(primary).toBeVisible();

      // Single target inside primary to avoid strict\u2011mode conflicts
      const target = primary
        .locator('[data-testid="model-canvas"], model-viewer')
        .first();
      // Accessibility (either role=img or aria-label present)
      const role = await target.getAttribute("role");
      const label = await target.getAttribute("aria-label");
      expect(role === "img" || !!label).toBeTruthy();

      // Visual snapshot (keep tight viewport to reduce flake)
      await page.setViewportSize({ width: 600, height: 400 });
      const shot = await primary.screenshot();
      expect(shot).toMatchSnapshot(`${p.key}-model.png`, { threshold: 0.05 });
    });

    test(`${p.url} loads within budget`, async ({ page }) => {
      const budgetMs = Number(process.env.MODEL_LOAD_BUDGET_MS || 5000);
      const start = Date.now();
      await page.goto(p.url, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(
        (k) => window.__modelsLoaded && window.__modelsLoaded[k],
        p.key,
        { timeout: 15000 },
      );
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThanOrEqual(budgetMs);
    });
  }
});
