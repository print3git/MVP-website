import { test, expect } from "@playwright/test";

test("basket button remains visible with invalid localStorage", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("print2Basket", "{oops");
  });
  await page.goto("/index.html");
  await expect(page.locator("#basket-button")).toBeVisible();
  await expect(page.locator("#basket-count")).toBeHidden();
});
