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

    test("button visible but count hidden when empty", async ({ page }) => {
      await page.goto(`/${file}`);
      await expect(
        page.locator("#basket-button"),
        "Basket button should be visible even with empty basket",
      ).toBeVisible();
      await expect(
        page.locator("#basket-count"),
        "Basket count should be hidden when empty",
      ).toBeHidden();
    });

    test("includes font awesome", async ({ page }) => {
      await page.goto(`/${file}`);
      const links = page.locator('head link[href*="font-awesome"]');
      await expect(links).not.toHaveCount(0);
    });

    test("adds item via UI shows basket and count", async ({ page }) => {
      await page.goto(`/${file}`);
      const addButton = page.locator("#add-basket-button");
      test.skip(
        (await addButton.count()) === 0,
        "Add to Basket button not present on this page",
      );
      await test.step("ensure add button visible", async () => {
        await expect(addButton, "Add to Basket button should be visible").toBeVisible();
      });
      await test.step("click add button", async () => {
        await addButton.click();
      });
      await test.step(
        "verify basket button becomes visible with count 1",
        async () => {
          await expect(
            page.locator("#basket-button"),
            "Basket button should appear after adding item",
          ).toBeVisible();
          await expect(
            page.locator("#basket-count"),
            "Basket count should be 1 after adding item",
          ).toHaveText("1");
        },
      );
      const storageLength = await page.evaluate(
        () => JSON.parse(localStorage.getItem("print2Basket") || "[]").length,
      );
      expect(storageLength, "localStorage should contain one item").toBe(1);
    });

    test("increments count for multiple added items", async ({ page }) => {
      await page.goto(`/${file}`);
      const addButton = page.locator("#add-basket-button");
      test.skip(
        (await addButton.count()) === 0,
        "Add to Basket button not present on this page",
      );
      await expect(addButton, "Add to Basket button should be visible").toBeVisible();
      for (let i = 1; i <= 3; i++) {
        await addButton.click();
        await expect(
          page.locator("#basket-count"),
          `Basket count should be ${i} after ${i} click(s)`,
        ).toHaveText(String(i));
      }
    });

    test("persists basket after reload", async ({ page }) => {
      await page.goto(`/${file}`);
      const addButton = page.locator("#add-basket-button");
      test.skip(
        (await addButton.count()) === 0,
        "Add to Basket button not present on this page",
      );
      await addButton.click();
      await page.reload();
      await test.step("verify basket persists after reload", async () => {
        await expect(
          page.locator("#basket-button"),
          "Basket button should still be visible after reload",
        ).toBeVisible();
        await expect(
          page.locator("#basket-count"),
          "Basket count should persist after reload",
        ).toHaveText("1");
      });
    });

    test("clearing basket keeps button visible", async ({ page }) => {
      await page.goto(`/${file}`);
      const addButton = page.locator("#add-basket-button");
      test.skip(
        (await addButton.count()) === 0,
        "Add to Basket button not present on this page",
      );
      await addButton.click();
      await page.evaluate(() => {
        localStorage.removeItem("print2Basket");
        window.dispatchEvent(new CustomEvent("basket-change"));
      });
      await expect(
        page.locator("#basket-button"),
        "Basket button should remain visible after clearing basket",
      ).toBeVisible();
      await expect(
        page.locator("#basket-count"),
        "Basket count should be hidden after clearing basket",
      ).toBeHidden();
    });

    test("handles corrupted localStorage gracefully", async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem("print2Basket", "not-json");
      });
      await page.goto(`/${file}`);
      await expect(
        page.locator("#basket-button"),
        "Basket button should be hidden when localStorage is corrupted",
      ).toBeHidden();
      await expect(
        page.locator("#basket-count"),
        "Basket count should be hidden when localStorage is corrupted",
      ).toBeHidden();
    });

    test("button visible when basket empty", async ({ page }) => {
      await page.goto(`/${file}`);
      await expect(
        page.locator("#basket-button"),
        "Basket button should be visible when no items in basket",
      ).toBeVisible();
    });
  });
}
