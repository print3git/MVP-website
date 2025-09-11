import { test, expect } from "@playwright/test";

// This test checks that key UI elements on index.html retain their layout and visibility.

test("index.html UI remains stable", async ({ page }) => {
  await page.goto("/index.html");

  // GLB model viewer is visible and sized correctly
  const viewer = page.locator("#glb-viewer");
  await expect(viewer).toBeVisible();
  const viewerBox = await viewer.boundingBox();
  expect(viewerBox?.width).toBeCloseTo(512, 1);
  expect(viewerBox?.height).toBeCloseTo(326, 1);

  // Model viewer spacing from prompt section above
  const promptBox = await page.locator("#prompt-section").boundingBox();
  const previewBox = await page.locator("#preview-wrapper").boundingBox();
  if (promptBox && previewBox) {
    expect(previewBox.top - promptBox.bottom).toBeCloseTo(16, 4);
  }

  // Prompt textarea, image drop zone and submit button
  const promptInput = page.locator("#promptInput");
  const dropZone = page.locator("#drop-zone");
  const submitButton = page.locator("#submit-button");
  await expect(promptInput).toBeVisible();
  await expect(dropZone).toBeVisible();
  await expect(submitButton).toBeVisible();
  const promptInputBox = await promptInput.boundingBox();
  const dropZoneBox = await dropZone.boundingBox();
  const submitBox = await submitButton.boundingBox();
  if (promptInputBox && submitBox) {
    expect(promptInputBox.right + 16).toBeCloseTo(submitBox.left, 4);
  }
  if (dropZoneBox && promptInputBox) {
    expect(dropZoneBox.top).toBeCloseTo(promptInputBox.bottom + 8, 4);
  }

  // Basket button bottom-right
  const basketBtn = page.locator("#basket-button");
  await expect(basketBtn).toBeVisible();
  const basketBox = await basketBtn.boundingBox();
  const viewport = page.viewportSize();
  if (basketBox && viewport) {
    expect(viewport.width - (basketBox.x + basketBox.width)).toBeLessThan(20);
    expect(viewport.height - (basketBox.y + basketBox.height)).toBeLessThan(20);
    expect(basketBox.width).toBeGreaterThan(30);
    expect(basketBox.height).toBeGreaterThan(30);
  }

  // Wizard banner
  const wizard = page.locator("#wizard-banner");
  await expect(wizard).toBeVisible();
  const wizardChildren = wizard.locator("> div");
  await expect(wizardChildren).toHaveCount(3);
  const wizardTexts = ["Create prompt", "Building model", "Purchase model"];
  for (let i = 0; i < 3; i++) {
    await expect(wizardChildren.nth(i)).toHaveText(wizardTexts[i]);
  }

  // Print run message
  const printRun = page.locator("#print-run-info");
  await expect(printRun).toBeVisible();
  await expect(printRun).toContainText(/print slots left/);

  // DnD quote (text may change, so only check visibility)
  const dndQuote = page.locator("#subreddit-quote");
  await expect(dndQuote).toBeVisible();

  // Box logo and main text
  const logo = page.locator('img[alt="print2 cube"]');
  await expect(logo).toBeVisible();
  const heading = page.locator("h1");
  await expect(heading).toBeVisible();

  // Stats ticker
  const statsTicker = page.locator("#stats-ticker");
  await expect(statsTicker).toBeVisible();

  // Navigation links and share buttons
  const navLinks = page
    .locator("header a")
    .filter({ hasNot: page.locator("#checkout-button") });
  await expect(navLinks).toHaveCount(7);
  const shareButtons = page.locator("header button[aria-label^='Share on']");
  await expect(shareButtons).toHaveCount(5);

  // Guarantee messages
  const guarantee = page.locator("#checkout-guarantee");
  await expect(guarantee).toBeVisible();
  await expect(guarantee).toContainText("Secure Checkout");
  await expect(guarantee).toContainText("Money-Back Guarantee");
  await expect(guarantee).toContainText("Free UK Shipping");
});
