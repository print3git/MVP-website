import { test, expect } from "@playwright/test";

async function checkModel(page, path: string) {
  await page.goto(path);
  const canvas = page.locator("#viewer canvas");
  await expect(canvas).toBeVisible();
  await page.waitForFunction(() => {
    // @ts-ignore
    return window.__viewer?.scene.children.some((c: any) => c.isMesh);
  });
  const hasContext = await page.evaluate(() => {
    const c = document.querySelector(
      "#viewer canvas",
    ) as HTMLCanvasElement | null;
    return !!c && c.getContext("webgl") !== null;
  });
  expect(hasContext).toBe(true);
}

test("index page loads model", async ({ page }) => {
  await checkModel(page, "/index.html");
});

test("payment page loads model", async ({ page }) => {
  await checkModel(page, "/payment.html");
});
