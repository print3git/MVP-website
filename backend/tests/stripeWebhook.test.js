const { mockSecrets } = require("../src/lib/mockEnv");

test("test env provides STRIPE_WEBHOOK_SECRET", () => {
  const original = process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.STRIPE_WEBHOOK_SECRET;
  jest.isolateModules(() => {
    const config = require("../config");
    expect(config.stripeWebhook).toBe(mockSecrets.STRIPE_WEBHOOK_SECRET);
  });
  if (original === undefined) {
    delete process.env.STRIPE_WEBHOOK_SECRET;
  } else {
    process.env.STRIPE_WEBHOOK_SECRET = original;
  }
});
