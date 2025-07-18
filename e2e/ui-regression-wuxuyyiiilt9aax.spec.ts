import { test, expect } from "@playwright/test";

const routes = [
  { name: "home", url: "/index.html" },
  { name: "editor", url: "/generate.html" },
  { name: "upload", url: "/designer_upload.html" },
  { name: "checkout", url: "/payment.html" },
  { name: "success", url: "/share.html" },
  { name: "settings", url: "/profile.html" },
];

test.describe("ui regression", () => {
  for (const route of routes) {
    test(route.name, async ({ page }) => {
      await page.goto(route.url);
      await page.waitForLoadState("networkidle");
      const dom = await page.evaluate(() => document.documentElement.outerHTML);
      expect(dom).toMatchSnapshot(`${route.name}.html`);
    });
  }
});
