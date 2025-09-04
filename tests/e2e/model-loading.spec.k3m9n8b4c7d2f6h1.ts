import { test, expect } from "@playwright/test";
import { configureToMatchImageSnapshot } from "jest-image-snapshot";
import fs from "fs";
import path from "path";

const baseMatcher = configureToMatchImageSnapshot({
  failureThreshold: 0.05,
  failureThresholdType: "percent",
});

expect.extend({
  toMatchImageSnapshot(received) {
    const info = test.info();
    const snapshotState = {
      _counters: new Map(),
      _updateSnapshot: process.env.JEST_IMAGE_SNAPSHOT_UPDATE ? "all" : "none",
      _snapshotData: {},
      _inlineSnapshots: new Map(),
      _snapshotPath: info.snapshotDir,
    } as any;
    return baseMatcher.call(
      { testPath: info.file, currentTestName: info.title, snapshotState },
      received,
    );
  },
});

const pages = [
  { name: "index.html", url: "/index.html" },
  { name: "payment.html", url: "/payment.html" },
];

for (const { name, url } of pages) {
  test(`loads model on ${name}`, async ({ page }) => {
    const threeSrc = fs.readFileSync(
      path.resolve(__dirname, "../load-model-pipeline/mocks/three.js"),
      "utf8",
    );
    const gltfSrc = fs.readFileSync(
      path.resolve(
        __dirname,
        "../load-model-pipeline/mocks/gltfLoader.js",
      ),
      "utf8",
    );
    await page.route(
      "https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js",
      (route) => route.fulfill({ contentType: "application/javascript", body: threeSrc }),
    );
    await page.route(
      "https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/loaders/GLTFLoader.js",
      (route) => route.fulfill({ contentType: "application/javascript", body: gltfSrc }),
    );
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    const start = await page.evaluate(() => performance.now());
    const glbResponse = page.waitForResponse(
      (res) => res.url().toLowerCase().endsWith(".glb") && res.ok(),
      { timeout: 5000 },
    );
    await page.goto(url);
    await glbResponse;
    const loadTime = await page.evaluate((s) => performance.now() - s, start);
    expect(loadTime).toBeLessThan(3000);

    const canvas = page.locator("#viewer canvas");
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveAttribute("role", "img");
    await expect(await canvas.getAttribute("aria-label")).not.toBeFalsy();

    await page.waitForFunction(
      () => (window as any).__viewerFrames > 0,
      undefined,
      { timeout: 5000 },
    );

    const screenshot = await canvas.screenshot();
    expect(screenshot).toMatchImageSnapshot();

    expect(
      consoleErrors.filter((e) => e.toLowerCase().includes("webgl")),
    ).toHaveLength(0);
  });
}

test("shows fallback when model missing", async ({ page }) => {
  await page.route("https://modelviewer.dev/shared-assets/models/Astronaut.glb", (route) => route.abort());
  await page.goto("/index.html");
  await expect(page.locator("#viewer")).toHaveText(/model not available/i);
});
