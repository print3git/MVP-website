import { test, expect } from "@playwright/test";
import axios from "axios";

const PROMPTS = [
  "red cube",
  "yellow sphere",
  "small house",
  "futuristic car",
  "ancient vase",
];

async function fetchWithRetry(url: string, options: any = {}, retries = 1) {
  for (let i = 0; ; i++) {
    try {
      return await axios({ url, ...options });
    } catch (err) {
      if (i >= retries) throw err;
    }
  }
}

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
  const head = await fetchWithRetry(glbUrl!, { method: "HEAD" });
  expect(head.status).toBe(200);
  const res = await fetchWithRetry(glbUrl!, { responseType: "arraybuffer" });
  expect(res.data.byteLength).toBeGreaterThan(0);
  expect(Buffer.from(res.data).toString("ascii", 0, 4)).toBe("glTF");
  const size = parseInt(head.headers["content-length"] || res.data.byteLength);
  expect(size).toBeGreaterThan(1000);
  return Date.now() - start;
}

test.describe("nightly glb generation", () => {
  for (const prompt of PROMPTS) {
    test(`generate for: ${prompt}`, async ({ page }) => {
      const ms = await generateAndValidate(page, prompt);
      console.log(`prompt \"${prompt}\" finished in ${ms}ms`);
    });
  }
});
