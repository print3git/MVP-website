import { test, expect } from "@playwright/test";

test("trust badge positioned correctly", async ({ page }) => {
  await page.goto("/payment.html");
  await page.waitForSelector("#trust-badge");

  const viewer = page.locator("#preview-wrapper");
  const badge = page.locator("#trust-badge");
  const slot = page.locator("text=print slots remaining");

  const viewerBox = await viewer.boundingBox();
  const badgeBox = await badge.boundingBox();
  const slotBox = await slot.boundingBox();

  expect(viewerBox).not.toBeNull();
  expect(badgeBox).not.toBeNull();
  expect(slotBox).not.toBeNull();

  // 1. badge is below viewer
  expect(badgeBox!.y).toBeGreaterThanOrEqual(viewerBox!.y + viewerBox!.height);

  // 2. badge is horizontally centered relative to viewer
  const viewerCenter = viewerBox!.x + viewerBox!.width / 2;
  const badgeCenter = badgeBox!.x + badgeBox!.width / 2;
  expect(Math.abs(viewerCenter - badgeCenter)).toBeLessThanOrEqual(1);

  // 3. badge does not overlap the slot count label
  const overlap =
    badgeBox!.x < slotBox!.x + slotBox!.width &&
    badgeBox!.x + badgeBox!.width > slotBox!.x &&
    badgeBox!.y < slotBox!.y + slotBox!.height &&
    badgeBox!.y + badgeBox!.height > slotBox!.y;
  expect(overlap).toBeFalsy();
});
