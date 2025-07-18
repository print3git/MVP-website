const { test, expect, playwright } = require("@playwright/test");

const browsers = ["chromium", "firefox", "webkit"];

for (const browserName of browsers) {
  test.describe(browserName, () => {
    test.use({ browserName });

    test("homepage and editor flow", async ({ page }, testInfo) => {
      const consoleMessages = [];
      page.on("console", (msg) => {
        if (["warning", "error"].includes(msg.type())) {
          consoleMessages.push(`${msg.type()}: ${msg.text()}`);
        }
      });
      page.on("pageerror", (err) =>
        consoleMessages.push(`pageerror: ${err.message}`),
      );

      // Homepage
      const response = await page.goto("/index.html");
      expect(response?.status()).toBe(200);
      await page.waitForSelector("#wizard-banner", { state: "visible" });
      const homeShot = await page.screenshot();
      await testInfo.attach(`home-${browserName}.png`, {
        body: homeShot,
        contentType: "image/png",
      });

      // Editor flow - use submit design page as representative editor
      await page.goto("/designer_upload.html");
      await page.waitForSelector("text=Submit Design", { timeout: 10000 });
      const editorShot = await page.screenshot();
      await testInfo.attach(`editor-${browserName}.png`, {
        body: editorShot,
        contentType: "image/png",
      });

      expect(consoleMessages).toEqual([]);
    });
  });
}
