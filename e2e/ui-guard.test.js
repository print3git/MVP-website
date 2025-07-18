const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
function getPages() {
  return fs
    .readdirSync(root)
    .filter((f) => f.endsWith(".html"))
    .map((f) => "/" + f);
}

const pages = getPages();
const colorSchemes = ["light", "dark"];
const viewports = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 800 },
};

for (const pageUrl of pages) {
  for (const color of colorSchemes) {
    for (const [vpName, viewport] of Object.entries(viewports)) {
      test(`ui ${pageUrl} ${color} ${vpName}`, async ({ page }) => {
        const messages = [];
        page.on("console", (msg) => {
          if (["warning", "error"].includes(msg.type())) {
            messages.push(msg.text());
          }
        });
        page.on("pageerror", (err) => messages.push(err.message));
        let bytes = 0;
        page.on("response", async (resp) => {
          const len = parseInt(resp.headers()["content-length"] || "0", 10);
          if (!Number.isNaN(len)) bytes += len;
        });

        await page.emulateMedia({ colorScheme: color });
        await page.setViewportSize(viewport);

        const start = Date.now();
        const response = await page.goto(pageUrl);
        const end = Date.now();

        expect(response?.status()).toBeLessThan(400);
        expect(messages, "console messages").toEqual([]);
        expect(end - start).toBeLessThanOrEqual(3000);
        expect(bytes).toBeLessThanOrEqual(1_000_000);

        const dom = await page.evaluate(
          () => document.documentElement.outerHTML,
        );
        expect(dom).toMatchSnapshot(
          `${pageUrl.replace(/\W+/g, "_")}_${color}_${vpName}.html`,
        );
      });
    }
  }
}
