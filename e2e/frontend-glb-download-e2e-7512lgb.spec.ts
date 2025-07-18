import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const PROMPT = "playwright download";

// This test exercises the model generation UI on the live site and verifies
// that the .glb file can be downloaded by the user.

test("download generated glb", async ({ page }, testInfo) => {
  await page.goto("/index.html");

  await page.waitForSelector("#promptInput", {
    state: "visible",
    timeout: 30000,
  });
  await page.fill("#promptInput", PROMPT);

  const [generateResponse] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/generate") && r.ok()),
    page.click("#submit-button"),
  ]);

  const data = await generateResponse.json();
  expect(data.glb_url).toBeTruthy();

  // Wait for the download button rendered after generation
  await page.waitForSelector("#download-glb", {
    state: "visible",
    timeout: 120000,
  });

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.click("#download-glb"),
  ]);

  const filePath = path.join(
    testInfo.outputDir,
    await download.suggestedFilename(),
  );
  await download.saveAs(filePath);
  const buffer = fs.readFileSync(filePath);
  expect(buffer.byteLength).toBeGreaterThan(0);
  expect(buffer.toString("ascii", 0, 4)).toBe("glTF");
});
