const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const routes = [
  { name: "home", url: "/index.html" },
  { name: "editor", url: "/generate.html" },
  { name: "upload", url: "/designer_upload.html" },
  { name: "checkout", url: "/payment.html" },
  { name: "success", url: "/share.html" },
  { name: "settings", url: "/profile.html" },
];

const viewports = [
  { label: "desktop", width: 1440, height: 900 },
  { label: "tablet", width: 768, height: 1024 },
  { label: "mobile", width: 375, height: 667 },
];

const modes = ["light", "dark"];

test.describe("visual regression", () => {
  for (const route of routes) {
    for (const mode of modes) {
      for (const viewport of viewports) {
        test(`${route.name} ${viewport.label} ${mode}`, async ({
          page,
        }, testInfo) => {
          await page.addInitScript((mode) => {
            try {
              if (mode === "light") {
                localStorage.setItem("colorScheme", "light");
              } else {
                localStorage.removeItem("colorScheme");
              }
            } catch {}
          }, mode);
          await page.setViewportSize({
            width: viewport.width,
            height: viewport.height,
          });
          await page.goto(route.url);
          await page.waitForLoadState("networkidle");
          const screenshot = await page.screenshot({ fullPage: true });
          const fileName = `${route.name}-${viewport.label}-${mode}.png`;
          const baselinePath = testInfo.snapshotPath(fileName);
          if (!fs.existsSync(baselinePath)) {
            fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
            fs.writeFileSync(baselinePath, screenshot);
          }
          expect(screenshot).toMatchSnapshot(fileName, { threshold: 0.2 });
        });
      }
    }
  }
});
