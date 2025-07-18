import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const baselineDir = path.resolve(__dirname, "../tests/visual-baseline");

async function compareScreenshot(page, name: string) {
  const screenshot = await page.screenshot({ fullPage: true });
  const baselinePath = path.join(baselineDir, `${name}.txt`);
  if (!fs.existsSync(baselinePath)) {
    throw new Error(`Baseline not found: ${baselinePath}`);
  }
  const baselineBase64 = fs.readFileSync(baselinePath, "utf8");
  const baseline = Buffer.from(baselineBase64, "base64");

  const img1 = PNG.sync.read(baseline);
  const img2 = PNG.sync.read(screenshot);
  const { width, height } = img1;
  if (width !== img2.width || height !== img2.height) {
    throw new Error("Screenshot size mismatch");
  }
  const diff = new PNG({ width, height });
  const diffPixels = pixelmatch(
    img1.data,
    img2.data,
    diff.data,
    width,
    height,
    { threshold: 0.1 },
  );
  const diffRatio = diffPixels / (width * height);
  expect(diffRatio).toBeLessThanOrEqual(0.001);
}

test("full flow visual regression", async ({ page }) => {
  await page.goto("/index.html");
  await compareScreenshot(page, "index_html");

  await page.goto("/generate.html");
  await compareScreenshot(page, "generate_html");

  await page.goto("/designer_upload.html");
  await compareScreenshot(page, "designer_upload_html");

  await page.goto("/payment.html");
  await compareScreenshot(page, "payment_html");

  await page.goto("/luckybox-payment.html");
  await compareScreenshot(page, "luckybox_payment_html");
});
