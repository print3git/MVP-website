/**
 * This test ensures run-smoke.js warns when required env vars are missing.
 */

test("warns for missing env vars", () => {
  const warnings = [];
  const origWarn = console.warn;
  console.warn = (msg) => warnings.push(msg);

  jest.isolateModules(() => {
    const originalStripe = process.env.STRIPE_TEST_KEY;
    const originalDomain = process.env.CLOUDFRONT_MODEL_DOMAIN;
    delete process.env.STRIPE_TEST_KEY;
    delete process.env.CLOUDFRONT_MODEL_DOMAIN;
    require("../../scripts/run-smoke.js");
    if (originalStripe !== undefined)
      process.env.STRIPE_TEST_KEY = originalStripe;
    if (originalDomain !== undefined)
      process.env.CLOUDFRONT_MODEL_DOMAIN = originalDomain;
  });

  console.warn = origWarn;
  expect(warnings.some((w) => w.includes("STRIPE_TEST_KEY"))).toBe(true);
  expect(warnings.some((w) => w.includes("CLOUDFRONT_MODEL_DOMAIN"))).toBe(
    true,
  );
});
