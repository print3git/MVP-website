import { test, expect } from "@playwright/test";

const pages = ["/index.html", "/payment.html"];

for (const path of pages) {
  test(`model-viewer smoke test for ${path}`, async ({ page }) => {
    await page.addInitScript(() => {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.addEventListener("message", (event) => {
          (window as any).__swMessages = (window as any).__swMessages || [];
          (window as any).__swMessages.push(event.data);
        });
      }
    });

    await page.goto(path);

    const viewer = page.locator("model-viewer");
    await expect(viewer).toHaveCount(1);
    await expect(viewer).toHaveAttribute("src", /Astronaut\.glb/);

    const swMessages = await page.evaluate(
      () => (window as any).__swMessages || [],
    );
    expect(
      swMessages.some((m: any) => m && m.type === "prefetch-models"),
    ).toBeFalsy();
  });
}
