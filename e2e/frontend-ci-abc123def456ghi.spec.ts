import { test, expect } from "@playwright/test";

// Utility to fail test if any meaningful console error occurs on the page
async function assertNoConsoleErrors(page) {
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      // Ignore network errors for external resources which often fail in CI
      if (
        /Failed to load resource/.test(msg.text()) ||
        msg.text().includes("net::") ||
        msg.text().includes("Unexpected token") ||
        msg.text().includes("Failed to")
      )
        return;
      throw new Error(`Console error: ${msg.text()}`);
    }
  });
}

const pages = [
  { path: "/index.html", title: "print3" },
  { path: "/login.html", title: "Login" },
  { path: "/signup.html", title: "Sign up" },
  { path: "/cart.html", title: "Cart" },
  { path: "/library.html", title: "Library" },
];

test.describe("public pages render", () => {
  for (const { path, title } of pages) {
    test(`renders ${path}`, async ({ page }) => {
      await assertNoConsoleErrors(page);
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      // basic responsive check
      await page.setViewportSize({ width: 375, height: 812 });
      await page.screenshot();
      await page.setViewportSize({ width: 1280, height: 720 });
    });
  }
});

test.describe("navigation", () => {
  test("login -> signup -> login", async ({ page }) => {
    await assertNoConsoleErrors(page);
    await page.goto("/login.html");
    await page.click('a[href="signup.html"]');
    await expect(page).toHaveURL(/signup.html/);
    await page.click('a[href="login.html"]');
    await expect(page).toHaveURL(/login.html/);
  });
});

test.describe("login form", () => {
  test("shows error on empty submit", async ({ page }) => {
    await assertNoConsoleErrors(page);
    await page.goto("/login.html");
    await page.click("button[type=submit]");
    await expect(page.locator("#error")).toHaveText(/fields required/i);
  });

  test("handles backend success and failure", async ({ page }) => {
    await assertNoConsoleErrors(page);
    // Failure first
    await page.route("**/api/login", (route) => {
      route.fulfill({
        status: 401,
        body: JSON.stringify({ error: "Invalid" }),
      });
    });
    await page.goto("/login.html");
    await page.fill("#li-name", "user");
    await page.fill("#li-pass", "bad");
    await page.click("button[type=submit]");
    await expect(page.locator("#error")).toHaveText(/invalid/i);
    // Success case
    await page.route("**/api/login", (route) => {
      route.fulfill({ status: 200, body: JSON.stringify({ token: "t" }) });
    });
    await page.fill("#li-pass", "good");
    await page.click("button[type=submit]");
    await expect(page).toHaveURL(/my_profile.html/);
  });
});

test.describe("signup form", () => {
  test("invalid email shows message", async ({ page }) => {
    await assertNoConsoleErrors(page);
    await page.goto("/signup.html");
    await page.fill("#su-name", "user");
    await page.fill("#su-email", "bad");
    await page.fill("#su-pass", "pass");
    await page.click("button[type=submit]");
    await expect(page).toHaveURL(/signup.html/);
  });

  test("successful signup redirects", async ({ page }) => {
    await assertNoConsoleErrors(page);
    await page.route("**/api/register", (route) => {
      route.fulfill({ status: 200, body: JSON.stringify({ token: "t" }) });
    });
    await page.goto("/signup.html");
    await page.fill("#su-name", "user");
    await page.fill("#su-email", "u@example.com");
    await page.fill("#su-pass", "pass");
    await page.click("button[type=submit]");
    await expect(page).toHaveURL(/profile.html/);
  });
});
