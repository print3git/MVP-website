const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

// Only run when DEBUG_SMOKE=1 to avoid slowing normal CI
const shouldRun = process.env.DEBUG_SMOKE === "1";

test.describe("debug generate flow", () => {
  test.skip(!shouldRun, "set DEBUG_SMOKE=1 to enable");

  test("capture network and console logs", async ({ page }, testInfo) => {
    const logs = [];
    page.on("console", (msg) => logs.push(msg.text()));

    const responses = [];
    page.on("response", async (response) => {
      if (response.url().includes("/api/generate")) {
        try {
          responses.push({
            url: response.url(),
            status: response.status(),
            body: await response.text(),
          });
        } catch (err) {
          responses.push({
            url: response.url(),
            status: response.status(),
            error: err.message,
          });
        }
      }
    });

    await page.goto("/generate.html");
    await page.waitForSelector("#gen-prompt", {
      state: "visible",
      timeout: 30000,
    });
    await page.fill("#gen-prompt", "test");
    await page.click("#gen-submit");

    // wait a bit for network events
    await page.waitForTimeout(5000);

    const outDir = testInfo.outputPath("debug");
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, "console.log"), logs.join("\n"), "utf8");
    fs.writeFileSync(
      path.join(outDir, "responses.json"),
      JSON.stringify(responses, null, 2),
    );
    await page.screenshot({ path: path.join(outDir, "screenshot.png") });

    // Basic assertion to ensure the page loaded
    expect(responses.length).toBeGreaterThan(0);
  });
});
