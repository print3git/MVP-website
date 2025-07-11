if (require.main === module) {
  console.error(
    'This file is a Playwright test. Run it with "npx playwright test e2e/smoke.test.js".',
  );
  process.exit(1);
}

const { test, expect } = require("@playwright/test");
const { percySnapshot } = require("@percy/playwright");

test("login flow", async ({ page }) => {
  await page.goto("/login.html");
  await expect(page).toHaveTitle(/Login/i);
  await percySnapshot(page, "login flow");
});

test("dashboard loads", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("token", "test-token"));
  const response = await page.goto("/my_profile.html");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/My Profile/i);
  await percySnapshot(page, "dashboard loads");
});

test("checkout flow", async ({ page }) => {
  await page.goto("/payment.html");
  await expect(page.locator("#submit-payment")).toBeVisible();
  await percySnapshot(page, "checkout flow");
});
\ntest("model generator page", async ({ page }) => {\n  await page.goto("/index.html");\n  await expect(page.locator("#viewer")).toBeVisible();\n});
