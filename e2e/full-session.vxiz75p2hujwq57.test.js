const { test, expect } = require("@playwright/test");
const path = require("path");

test.use({
  baseURL: "http://localhost:3000",
  timeout: 60000,
});

test("full user session home -> editor -> upload -> checkout -> success", async ({
  page,
}) => {
  page.on("pageerror", (err) => {
    throw err;
  });

  // Mock API responses
  await page.route("**/api/generate", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ glb_url: "/models/bag.glb", jobId: "t123" }),
    });
  });
  await page.route("**/api/create-order", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ checkoutUrl: "/payment.html?session_id=test123" }),
    });
  });
  await page.route("**/api/payment-init", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "{}",
    });
  });
  await page.route("**/api/subscribe", (route) =>
    route.fulfill({ status: 200, body: "{}" }),
  );

  // Home
  await page.goto("/index.html");
  await page.waitForSelector("#promptInput");
  await expect(page.locator("#viewer")).toBeVisible();

  // Upload image file
  const img = path.join(__dirname, "..", "img", "boxlogo.png");
  await page.setInputFiles("#uploadInput", img);
  await expect(page.locator("#image-preview-area")).toBeVisible();

  // Generate model
  await page.fill("#promptInput", "test prompt");
  await page.click("#submit-button");
  await page.waitForSelector("#checkout-button", { state: "visible" });
  await expect(page.locator("#checkout-button")).toBeVisible();

  const modelUrl = await page.evaluate(() =>
    localStorage.getItem("print3Model"),
  );
  expect(modelUrl).toContain(".glb");

  // Checkout
  await Promise.all([page.waitForNavigation(), page.click("#checkout-button")]);

  await page.waitForSelector("#submit-payment");
  await page.fill("#ship-name", "Test User");
  await page.fill("#checkout-email", "test@example.com");
  await page.fill("#ship-address", "123 Test St");
  await page.fill("#ship-city", "Testville");
  await page.fill("#ship-zip", "12345");

  await Promise.all([page.waitForNavigation(), page.click("#submit-payment")]);

  await page.waitForSelector("#success", { state: "visible" });
  await expect(page.locator("#success")).toContainText("Payment successful");

  const storedModel = await page.evaluate(() =>
    localStorage.getItem("print3Model"),
  );
  expect(storedModel).toBe(modelUrl);

  const cookies = await page.context().cookies();
  expect(Array.isArray(cookies)).toBe(true);
});
