import { test, expect } from "@playwright/test";
import { waitForModelViewer, intercept } from "./utils";

const STATIC_BASE = process.env.STATIC_SERVER_URL || "http://localhost:3000";

test.beforeEach(async ({ page }) => {
  // Forward browser console and failed network requests to the test logs
  page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
  page.on("requestfailed", (req) =>
    console.log("REQUEST FAIL:", req.url(), req.failure()),
  );
});

test.describe("Basic rendering", () => {
  test("Index loads model-viewer and astronaut model", async ({ page }) => {
    const modelReq = await intercept(page, "Astronaut.glb");
    const envReq = await intercept(page, "neutral.hdr");
    await page.goto(`${STATIC_BASE}/index.html`);
    await waitForModelViewer(page);
    expect(modelReq.length).toBeGreaterThan(0);
    expect(modelReq[0].url()).toMatch(/Astronaut\.glb$/);
    expect(envReq.length).toBeGreaterThan(0);
    expect(envReq[0].url()).toMatch(/neutral\.hdr$/);
  });

  test("Payment page loads model-viewer and astronaut model", async ({
    page,
  }) => {
    const modelReq = await intercept(page, "Astronaut.glb");
    const envReq = await intercept(page, "neutral.hdr");
    await page.goto(`${STATIC_BASE}/payment.html`);
    await waitForModelViewer(page);
    expect(modelReq.length).toBeGreaterThan(0);
    expect(envReq.length).toBeGreaterThan(0);
  });
});

test.describe("Custom src parameter", () => {
  test("modelLoader.js applies custom ?model url", async ({ page }) => {
    const custom = "https://example.com/a.glb";
    await page.goto(`${STATIC_BASE}/index.html?model=${encodeURIComponent(custom)}`);
    await waitForModelViewer(page);
    await expect(page.locator("model-viewer")).toHaveAttribute("src", custom);
  });

  const invalid = ["", "null", "undefined", "0", "false"];
  for (const val of invalid) {
    test(`Fallback to default for ?model=${val}`, async ({ page }) => {
      await page.goto(`${STATIC_BASE}/index.html?model=${val}`);
      await waitForModelViewer(page);
      await expect(page.locator("model-viewer")).toHaveAttribute(
        "src",
        /Astronaut\.glb$/,
      );
    });
  }
});

test.describe("Script loading behaviour", () => {
  test("Remote CDN script success path", async ({ page }) => {
    await page.goto(`${STATIC_BASE}/index.html`);
    await waitForModelViewer(page);
    const scripts = page.locator('script[src*="model-viewer"]');
    await expect(scripts).toHaveCount(1);
    const src = await scripts.first().getAttribute("src");
    expect(src).toMatch(/cdn\.jsdelivr\.net/);
    expect(
      await page.evaluate(() => !!customElements.get("model-viewer")),
    ).toBe(true);
  });

  test("Remote CDN script failure falls back to local script", async ({
    page,
  }) => {
    await page.route(
      "https://cdn.jsdelivr.net/npm/@google/model-viewer@1.12.0/dist/model-viewer.min.js",
      (route) => route.abort(),
    );
    const localReqs = await intercept(page, "js/model-viewer.min.js");
    await page.goto(`${STATIC_BASE}/index.html`);
    await waitForModelViewer(page);
    expect(localReqs.length).toBeGreaterThan(0);
    expect(
      await page.evaluate(() => !!customElements.get("model-viewer")),
    ).toBe(true);
  });
});

test.describe("Multiple model-viewers", () => {
  test("All instances get src and environment-image", async ({ page }) => {
    const content = `
      <html>
      <head>
        <script type="module" src="${STATIC_BASE}/js/modelLoader.js"></script>
        <script type="module" src="${STATIC_BASE}/js/modelViewerFallback.js"></script>
      </head>
      <body>
        ${"<model-viewer></model-viewer>".repeat(5)}
      </body>
      </html>`;
    await page.setContent(content);
    await waitForModelViewer(page);
    const viewers = page.locator("model-viewer");
    await expect(viewers).toHaveCount(5);
    const allAttrs = await viewers.evaluateAll((nodes) =>
      nodes.every(
        (n) =>
          n.getAttribute("src")?.endsWith("Astronaut.glb") &&
          n.getAttribute("environment-image")?.endsWith("neutral.hdr"),
      ),
    );
    expect(allAttrs).toBe(true);
  });
});

test.describe("Removal of element", () => {
  test("Graceful behaviour when no model-viewer present", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.setContent(`
      <html>
      <head>
        <script type="module" src="${STATIC_BASE}/js/modelLoader.js"></script>
        <script type="module" src="${STATIC_BASE}/js/modelViewerFallback.js"></script>
      </head>
      <body></body>
      </html>
    `);
    await page.waitForLoadState("load");
    expect(errors).toEqual([]);
  });
});

test.describe("Network edge cases", () => {
  test("Neutral HDR missing causes network error log", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.route("**/neutral.hdr", (route) =>
      route.fulfill({ status: 404 }),
    );
    await page.goto(`${STATIC_BASE}/index.html`);
    await waitForModelViewer(page);
    expect(errors.some((e) => e.includes("neutral.hdr"))).toBe(true);
    await expect(page.locator("model-viewer")).not.toHaveAttribute(
      "environment-image",
      /neutral.hdr/,
    );
  });

  test("Astronaut.glb 404 causes console error & fallback message", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.route("**/Astronaut.glb", (route) =>
      route.fulfill({ status: 404 }),
    );
    await page.goto(`${STATIC_BASE}/index.html`);
    await page.waitForLoadState("load");
    const expectedError =
      "GET https://modelviewer.dev/shared-assets/models/Astronaut.glb 404 (Not Found)";
    expect(errors).toContain(expectedError);
  });
});

test.describe("Timing conditions", () => {
  test("DOMContentLoaded triggers load only once", async ({ page }) => {
    const modelReq = await intercept(page, "Astronaut.glb");
    await page.goto(`${STATIC_BASE}/index.html`);
    await waitForModelViewer(page);
    expect(modelReq.length).toBe(1);
    await page.reload();
    expect(modelReq.length).toBe(1);
  });
});

test.describe("Visual sanity snapshot", () => {
  test("captures screenshot of model-viewer", async ({ page }) => {
    await page.goto(`${STATIC_BASE}/index.html`);
    await waitForModelViewer(page);
    const buf = await page.locator("model-viewer").screenshot();
    expect(buf.length).toBeGreaterThan(0);
  });
});
