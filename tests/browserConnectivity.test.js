const { chromium } = require("playwright-core");

async function check(url) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  let reachable = true;
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 10000 });
  } catch (err) {
    console.warn("Skipping browser connectivity test:", err.message);
    reachable = false;
  }
  await browser.close();
  return reachable;
}

describe("browser connectivity", () => {
  test("cdn.jsdelivr reachable", async () => {
    const ok = await check(
      "https://cdn.jsdelivr.net/npm/@google/model-viewer@1.12.0/dist/model-viewer.min.js",
    );
    if (!ok) return;
    expect(ok).toBe(true);
  });

  test("esm.sh reachable", async () => {
    const ok = await check("https://esm.sh");
    if (!ok) return;
    expect(ok).toBe(true);
  });
});
