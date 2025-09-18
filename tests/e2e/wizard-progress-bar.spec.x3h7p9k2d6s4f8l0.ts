import { test, expect } from "@playwright/test";

async function reachPurchaseStage(page: import("@playwright/test").Page) {
  await page.evaluate(() => {
    // @ts-ignore - exposed for tests
    window.setWizardStage("purchase");
    // @ts-ignore - exposed for tests
    window.setWizardSlotCount(2);
  });
}

for (const path of ["/index.html", "/payment.html"]) {
  test(`shows print counter after progress on ${path}`, async ({ page }) => {
    await page.goto(path);
    await reachPurchaseStage(page);
    await expect(page.locator("#wizard-step-prompt")).toHaveCSS(
      "background-color",
      "rgb(48, 213, 200)",
    );
    await expect(page.locator("#wizard-step-building")).toHaveCSS(
      "background-color",
      "rgb(48, 213, 200)",
    );
    const slots = page.locator("#wizard-slots");
    await expect(slots).toBeVisible();
    await expect(slots).toHaveText("Only 2 print slots left:");
  });
}
