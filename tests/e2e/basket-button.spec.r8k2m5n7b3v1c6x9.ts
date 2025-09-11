import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const root = path.resolve(__dirname, "../../");
const basketPages = fs
  .readdirSync(root)
  .filter((f) => f.endsWith(".html"))
  .filter((f) =>
    fs.readFileSync(path.join(root, f), "utf8").includes("js/basket.js"),
  );

for (const file of basketPages) {
  test.describe(`basket button on ${file}`, () => {
    test("shows count when items exist", async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem("print2Basket", JSON.stringify([{ modelUrl: "m" }]));
      });
      await page.goto(`/${file}`);
      await expect(page.locator("#basket-button")).toBeVisible();
      await expect(page.locator("#basket-count")).toHaveText("1");
    });

    test("hides count when empty", async ({ page }) => {
      await page.goto(`/${file}`);
      await expect(page.locator("#basket-count")).toBeHidden();
    });

    test("includes font awesome", async ({ page }) => {
      await page.goto(`/${file}`);
      const links = page.locator('head link[href*="font-awesome"]');
      await expect(links).not.toHaveCount(0);
    });
  });
}
