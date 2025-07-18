import { test, expect } from "@playwright/test";

test("no broken links or images", async ({ page }) => {
  await page.goto("/index.html");
  await page.waitForLoadState("load");

  const hrefs = await page.$$eval("a[href]", (els) =>
    els.map((el) => (el as HTMLAnchorElement).getAttribute("href")),
  );
  for (const href of hrefs) {
    if (
      !href ||
      href.startsWith("#") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:")
    )
      continue;
    const url = new URL(href, page.url()).toString();
    if (!url.startsWith(page.url().split("/").slice(0, 3).join("/"))) continue; // skip external links
    const res = await page.request.get(url);
    expect(res.status(), `${url} status`).toBeLessThan(400);
  }

  const images = await page.$$eval("img", (imgs) =>
    imgs.map((img) => ({
      src: img.getAttribute("src"),
      alt: img.getAttribute("alt"),
    })),
  );
  for (const { src, alt } of images) {
    expect(alt && alt.trim().length).toBeTruthy();
    if (!src) continue;
    const url = new URL(src, page.url()).toString();
    const res = await page.request.get(url);
    expect(res.status(), `${url} status`).toBeLessThan(400);
  }
});
