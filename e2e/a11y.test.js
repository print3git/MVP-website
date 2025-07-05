const { test, expect } = require("@playwright/test");
const { AxeBuilder } = require("@axe-core/playwright");
const fs = require("fs");
const path = require("path");

const pages = ["/index.html", "/login.html", "/signup.html", "/payment.html"];
const baselinePath = path.join(__dirname, "a11y-baseline.json");
const baseline = fs.existsSync(baselinePath)
  ? JSON.parse(fs.readFileSync(baselinePath, "utf8"))
  : {};

// Normalize stored baseline arrays so ordering doesn't cause test failures
for (const url of Object.keys(baseline)) {
  baseline[url] = baseline[url].sort();
}

for (const url of pages) {
  test(`a11y check ${url}`, async ({ page }) => {
    await page.goto(url);
    const results = await new AxeBuilder({ page }).analyze();
    const violations = results.violations.filter((v) =>
      ["critical", "serious"].includes(v.impact),
    );
    const ids = violations.map((v) => v.id).sort();

    if (!baseline[url]) {
      baseline[url] = ids;
      fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2));
    }

    expect(ids).toEqual(baseline[url]);
  });
}
