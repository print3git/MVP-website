import { test, expect } from "@playwright/test";
import axios from "axios";

const PROMPT = "basic cube model";

async function generateAndValidate(page, prompt: string) {
  await page.goto("/generate.html");
  await page.waitForSelector("#gen-prompt", {
    state: "visible",
    timeout: 30000,
  });
  await page.fill("#gen-prompt", prompt);
  const start = Date.now();
  await page.click("#gen-submit");
  await page.waitForFunction(() => (document as any).body.dataset.viewerReady, {
    timeout: 180000,
  });
  const glbUrl = await page.locator("model-viewer").getAttribute("src");
  expect(glbUrl).toBeTruthy();
  const head = await axios.head(glbUrl!);
  expect(head.status).toBe(200);
  const res = await axios.get(glbUrl!, { responseType: "arraybuffer" });
  expect(res.data.byteLength).toBeGreaterThan(0);
  expect(Buffer.from(res.data).toString("ascii", 0, 4)).toBe("glTF");
  const size = parseInt(head.headers["content-length"] || res.data.byteLength);
  expect(size).toBeGreaterThan(1000);
  return Date.now() - start;
}

test("glb generation smoke", async ({ page }) => {
  const ms = await generateAndValidate(page, PROMPT);
  console.log(`generation time ${ms}ms`);
});
