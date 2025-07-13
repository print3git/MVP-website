/** @jest-environment node */
const { chromium } = require("playwright");
const { startDevServer } = require("../../../scripts/dev-server");

test("model-viewer loads from local copy when CDN HEAD fails", async () => {
  const server = startDevServer(0);
  const { port } = server.address();
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.route(
    "https://cdn.jsdelivr.net/npm/@google/model-viewer@1.12.0/dist/model-viewer.min.js",
    (route, request) => {
      if (request.method() === "HEAD") {
        route.abort();
      } else {
        route.continue();
      }
    },
  );
  await page.goto(`http://127.0.0.1:${port}/index.html`);
  await page.waitForSelector('body[data-viewer-ready="true"]', {
    timeout: 10000,
  });
  const visible = await page.isVisible("#viewer");
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
  expect(visible).toBe(true);
});
