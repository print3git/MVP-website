test("test env provides STRIPE_WEBHOOK_SECRET", () => {
  const original = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  jest.resetModules();
  const config = require("../config");
  expect(config.stripeWebhook).toBe("whsec");
  if (original === undefined) {
    delete process.env.STRIPE_WEBHOOK_SECRET;
  } else {
    process.env.STRIPE_WEBHOOK_SECRET = original;
  }
});
