import { test, expect } from "@playwright/test";

test("basket button visible with corrupted storage", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("print2Basket", "{oops");
  });
  await page.goto("/index.html");
  await expect(page.locator("#basket-button")).toBeVisible();
  await expect(page.locator("#basket-count")).toBeHidden();
});

test("basket count stays at 0 when glb-viewer src cleared", async ({
  page,
}) => {
  test.fail(true, "FIXME: basket increments when glb-viewer src is missing");
  await page.goto("/index.html");
  await page.evaluate(() => {
    const viewer = document.querySelector<HTMLImageElement>("#glb-viewer");
    if (viewer) viewer.src = "";
  });
  const count = page.locator("#basket-count");
  await expect(count).toHaveText("0");
  await page.locator("#add-basket-button").click();
  await expect(count).toHaveText("0");
});

test("index add-basket button adds item when viewer src is empty", async ({ page }) => {
  await page.goto("/index.html");
  await page.evaluate(() => {
    const viewer = document.getElementById("glb-viewer");
    if (viewer) viewer.removeAttribute("src"); // simulate empty viewer
  });
  await page.locator("#add-basket-button").click();
  await expect(page.locator("#basket-count")).toHaveText("1");
});

