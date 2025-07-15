const { test, expect } = require("@playwright/test");

const pages = ["/", "/generate.html", "/login.html"];

test.describe("static pages respond", () => {
  for (const path of pages) {
    test(`GET ${path} returns 200`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
    });
  }
});
