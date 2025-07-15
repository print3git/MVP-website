const { test, expect } = require("@playwright/test");

test("generate page loads", async ({ page }) => {
  const response = await page.goto("/generate.html");
  expect(response?.status()).toBe(200);
  await page.waitForSelector("#gen-prompt", {
    state: "visible",
    timeout: 10000,
  });
});

test("generate success shows confirmation", async ({ page }) => {
  await page.route("/api/generate", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ glb_url: "/models/test.glb" }),
    });
  });

  await page.goto("/generate.html");
  // Wait for the form to appear before filling it.
  await page.waitForSelector("#gen-prompt", {
    state: "visible",
    timeout: 10000,
  });
  await page.fill("#gen-prompt", "test");
  await page.click("#gen-submit");
  await expect(page.locator("#gen-success")).toHaveText(/Model generated!/);
  await expect(page.locator("canvas")).toBeVisible();
});

test("generate failure shows error message", async ({ page }) => {
  await page.route("/api/generate", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "SPARC3D_TOKEN is not set" }),
    });
  });

  await page.goto("/generate.html");
  await page.waitForSelector("#gen-prompt", {
    state: "visible",
    timeout: 10000,
  });
  await page.fill("#gen-prompt", "test");
  await page.click("#gen-submit");
  await expect(page.locator(".text-red-500")).toHaveText(
    /SPARC3D_TOKEN is not set/,
  );
});
