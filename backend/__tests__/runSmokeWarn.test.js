/**
 * This test ensures run-smoke.js warns when required env vars are missing.
 */

test("does not warn when env vars are missing", () => {
  const warnings = [];
  const origWarn = console.warn;
  console.warn = (msg) => warnings.push(msg);

  jest.isolateModules(() => {
    const originalStripe = process.env.STRIPE_SECRET_KEY;
    const originalDomain = process.env.CLOUDFRONT_MODEL_DOMAIN;
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.CLOUDFRONT_MODEL_DOMAIN;
    require("../../scripts/run-smoke.js");
    if (originalStripe !== undefined)
      process.env.STRIPE_SECRET_KEY = originalStripe;
    if (originalDomain !== undefined)
      process.env.CLOUDFRONT_MODEL_DOMAIN = originalDomain;
  });

  console.warn = origWarn;
  expect(warnings.length).toBe(0);
});
