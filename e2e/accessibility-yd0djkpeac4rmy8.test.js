const { test, expect } = require("@playwright/test");
const { AxeBuilder } = require("@axe-core/playwright");

const pages = ["/index.html", "/login.html", "/signup.html", "/payment.html"];

for (const url of pages) {
  test(`accessibility checks for ${url}`, async ({ page }) => {
    await page.goto(url);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}
