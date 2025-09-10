import { test, expect, Page } from "@playwright/test";

async function waitForModelLoad(page: Page) {
  await page.evaluate(() => {
    const viewer = document.querySelector("model-viewer") as any;
    if (!viewer) return;
    if (viewer.loaded) return;
    return new Promise<void>((resolve) => {
      viewer.addEventListener("load", () => resolve(), { once: true });
    });
  });
}

const pages = [
  { key: "index", url: "/index.html" },
  { key: "payment", url: "/payment.html" },
];

// 1. Page loads & primary container visible (index)
test("index: primary container visible", async ({ page }) => {
  await page.goto("/index.html");
  await expect(page.locator("#preview-wrapper")).toBeVisible();
});

// 2. Page loads & primary container visible (payment)
test("payment: primary container visible", async ({ page }) => {
  await page.goto("/payment.html");
  await expect(page.locator("#preview-wrapper")).toBeVisible();
});

// 3–4. Model loads (index, payment)
for (const p of pages) {
  test(`${p.key}: model loads`, async ({ page }) => {
    await page.goto(p.url, { waitUntil: "domcontentloaded" });
    await waitForModelLoad(page);
  });
}

// 5–6. Viewer element present and visible (index, payment)
for (const p of pages) {
  test(`${p.key}: viewer element visible`, async ({ page }) => {
    await page.goto(p.url);
    await expect(page.locator("model-viewer").first()).toBeVisible();
  });
}

// 7–8. Accessibility present: role=img OR aria-label (index, payment)
for (const p of pages) {
  test(`${p.key}: a11y attributes present`, async ({ page }) => {
    await page.goto(p.url);
    const target = page.locator("model-viewer").first();
    const role = await target.getAttribute("role");
    const label = await target.getAttribute("aria-label");
    expect(role === "img" || !!label).toBeTruthy();
  });
}

// 9–10. Performance budget: model ready under 5s (index, payment)
for (const p of pages) {
  test(`${p.key}: model loads under budget`, async ({ page }) => {
    const start = Date.now();
    await page.goto(p.url);
    await waitForModelLoad(page);
    expect(Date.now() - start).toBeLessThanOrEqual(
      Number(process.env.MODEL_LOAD_BUDGET_MS || 5000),
    );
  });
}

// 11–12. No severe console errors during load (index, payment)
for (const p of pages) {
  test(`${p.key}: no console errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.goto(p.url);
    await waitForModelLoad(page);
    // Allow CORS warnings but fail on real errors
    expect(errors.filter((e) => !/cors|devtools/i.test(e)).length).toBe(0);
  });
}
