import { test, expect } from "@playwright/test";
import path from "path";

test("full frontend pipeline slow network", async ({ page, context }) => {
  const client = await context.newCDPSession(page);
  await client.send("Network.enable");
  await client.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 300,
    downloadThroughput: 125000,
    uploadThroughput: 125000,
    connectionType: "cellular3g",
  });

  await page.goto("/index.html");
  await expect(page.locator("#submit-button")).toBeVisible();

  await page.goto("/generate.html");
  await page.waitForSelector("#gen-prompt", {
    state: "visible",
    timeout: 30000,
  });
  await page.route("**/api/generate", async (route) => {
    await new Promise((r) => setTimeout(r, 1000));
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ glb_url: "/models/bag.glb" }),
    });
  });
  await page.fill("#gen-prompt", "basic cube");
  const [spinner] = await Promise.all([
    page.waitForSelector("div.animate-spin", { state: "visible" }),
    page.click("#gen-submit"),
  ]);
  await expect(spinner).toBeVisible();
  await page.waitForSelector("#gen-success", { state: "visible" });

  await page.goto("/designer_upload.html");
  await page.waitForSelector("#designer-form");
  await page.route("**/api/designer-submissions", async (route) => {
    await new Promise((r) => setTimeout(r, 1000));
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
  const fixture = path.join(__dirname, "..", "models", "bag.glb");
  await page.setInputFiles("#model-input", fixture);
  await Promise.all([
    page.waitForSelector("#form-msg", { state: "visible" }),
    page.click("#designer-form button[type=submit]"),
  ]);

  await page.goto("/payment.html");
  await expect(page.locator("#submit-payment")).toBeVisible();

  await page.goto("/payment.html?session_id=test123");
  await expect(page.locator("#success")).toBeVisible();
});
