import { test, expect, chromium } from "@playwright/test";

test("chromium launches", async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto("about:blank");
  await expect(page).toHaveTitle("");
  await browser.close();
});
