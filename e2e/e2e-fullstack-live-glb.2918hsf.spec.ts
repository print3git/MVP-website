const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const CHECK_SCRIPT = path.join(
  __dirname,
  "..",
  "scripts",
  "check-glb-integrity.js",
);

async function downloadWithRetry(request, url, attempts = 3) {
  let last;
  for (let i = 0; i < attempts; i++) {
    last = await request.get(url);
    if (last.ok()) return last;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`failed to download ${url}: status ${last.status()}`);
}

test("@pipeline fullstack live glb flow", async ({ page }, testInfo) => {
  if (
    !process.env.STRIPE_SECRET_KEY ||
    !process.env.AWS_ACCESS_KEY_ID ||
    !process.env.HF_API_KEY
  ) {
    test.skip(true, "live secrets missing");
  }

  const start = Date.now();
  await page.goto("/generate.html");
  await page.waitForSelector("#gen-prompt", {
    state: "visible",
    timeout: 30000,
  });
  await page.fill("#gen-prompt", "playwright full pipeline");

  const [response] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes("/api/generate") && r.status() === 200,
      { timeout: 10 * 60 * 1000 },
    ),
    page.click("#gen-submit"),
  ]);

  const data = await response.json();
  const url = data.glb_url;
  console.log("generation returned", url);
  expect(url).toBeTruthy();

  // Wait for viewer to load
  await page.waitForFunction(
    () => document.body.dataset.viewerReady === "true",
    { timeout: 120000 },
  );
  await page.waitForSelector("canvas", { timeout: 60000 });
  console.log("viewer ready in", Date.now() - start, "ms");

  const res = await downloadWithRetry(page.request, url);
  const buf = await res.body();
  const file = path.join(testInfo.outputDir, "model.glb");
  fs.writeFileSync(file, buf);

  const check = spawnSync("node", [CHECK_SCRIPT, file], { encoding: "utf8" });
  console.log("integrity stdout", check.stdout.trim());
  if (check.stderr) console.error("integrity stderr", check.stderr.trim());
  expect(check.status).toBe(0);

  const bboxExists = await page.evaluate(() => {
    const mv = document.querySelector("model-viewer");
    return !!(mv && mv.model && mv.model.boundingBox);
  });
  expect(bboxExists).toBe(true);
  console.log("total time", Date.now() - start, "ms");
});
