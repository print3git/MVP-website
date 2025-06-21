const { test, expect } = require('@playwright/test');
const { AxeBuilder } = require('@axe-core/playwright');

const pages = [
  '/index.html',
  '/login.html',
  '/signup.html',
  '/payment.html'
];

for (const url of pages) {
  test(`a11y check ${url}`, async ({ page }) => {
    await page.goto(url);
    const results = await new AxeBuilder({ page }).analyze();
    const violations = results.violations.filter(v => ['critical', 'serious'].includes(v.impact));
    expect(violations, `Accessibility issues on ${url}: ${violations.map(v => v.id).join(', ')}`).toHaveLength(0);
  });
}
