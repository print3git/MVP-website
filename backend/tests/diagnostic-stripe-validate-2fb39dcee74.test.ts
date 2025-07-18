const Stripe = require("stripe");

const secret = process.env.STRIPE_SECRET_KEY;
const webhook = process.env.STRIPE_WEBHOOK_SECRET;
const secretPlaceholder = !secret || /dummy|your|sk_test$/.test(secret);
const webhookPlaceholder = !webhook || /dummy|your|whsec$/.test(webhook);
const skip = process.env.CI && (secretPlaceholder || webhookPlaceholder);

/**
 * This diagnostic suite ensures the environment provides real Stripe
 * credentials and that they are functional. When CI uses placeholder
 * keys (e.g. `sk_test`), the suite is skipped to avoid false failures.
 */
(skip ? describe.skip : describe)("diagnostic stripe validate", () => {
  test("required env vars are present", () => {
    if (!secret) {
      throw new Error("STRIPE_SECRET_KEY missing");
    }
    if (!webhook) {
      throw new Error("STRIPE_WEBHOOK_SECRET missing");
    }
    // Fail if using placeholders from example env files
    expect(secret).toMatch(/^sk_/);
    expect(secret).not.toMatch(/dummy|your|sk_test$/);
    expect(webhook).toMatch(/^whsec_/);
    expect(webhook).not.toMatch(/dummy|your|whsec$/);
  });

  test("stripe client boots and lists customers", async () => {
    const stripe = new Stripe(secret, { apiVersion: "2024-08-16" });
    const list = await stripe.customers.list({ limit: 1 });
    expect(Array.isArray(list.data)).toBe(true);
  });
});
