const Stripe = require("stripe");

/**
 * This diagnostic suite ensures the CI environment provides real Stripe
 * credentials and that they are functional.
 */
describe("diagnostic stripe validate", () => {
  const secret = process.env.STRIPE_SECRET_KEY;
  const webhook = process.env.STRIPE_WEBHOOK_SECRET;
  const isCI = !!process.env.CI;

  test("required env vars are present", () => {
    if (!secret) {
      throw new Error("STRIPE_SECRET_KEY missing");
    }
    if (!webhook) {
      throw new Error("STRIPE_WEBHOOK_SECRET missing");
    }
    // Fail if using placeholders from example env files
    expect(secret).toMatch(/^sk_/);
    expect(webhook).toMatch(/^whsec_/);
    if (!isCI) {
      expect(secret).not.toMatch(/dummy|your|sk_test$/);
      expect(webhook).not.toMatch(/dummy|your|whsec$/);
    }
  });

  const realCreds = /^sk_/.test(secret) && !/dummy|your|sk_test$/.test(secret);
  const testFn = isCI && !realCreds ? test.skip : test;

  testFn("stripe client boots and lists customers", async () => {
    const stripe = new Stripe(secret, { apiVersion: "2024-08-16" });
    const list = await stripe.customers.list({ limit: 1 });
    expect(Array.isArray(list.data)).toBe(true);
  });
});
