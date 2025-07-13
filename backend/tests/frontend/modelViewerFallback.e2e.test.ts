/** @jest-environment node */
const { chromium } = require("playwright-core");
const { startDevServer } = require("../../../scripts/dev-server");

test.skip(
  "model-viewer falls back to local copy when CDN fails",
  async () => {
    const server = startDevServer(0);
    const { port } = server.address();
    const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.route(
    "https://cdn.jsdelivr.net/npm/@google/model-viewer@1.12.0/dist/model-viewer.min.js",
    (route) => route.abort(),
  );
  await page.goto(`http://127.0.0.1:${port}/index.html`);
  await page.waitForSelector('body[data-viewer-ready="true"]', {
    timeout: 120000,
  });
  const visible = await page.isVisible("#viewer");
  const source = await page.evaluate(() => window["modelViewerSource"]);
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
    expect(visible).toBe(true);
    expect(source).toBe("local");
  },
  120000,
);
