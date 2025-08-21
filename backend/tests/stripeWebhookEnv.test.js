const { mockSecrets } = require("../src/lib/mockEnv");

describe("stripe webhook secret env handling", () => {
  const originalEnv = process.env.NODE_ENV;
  const originalSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const originalKey = process.env.STRIPE_SECRET_KEY;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    if (originalSecret) {
      process.env.STRIPE_WEBHOOK_SECRET = originalSecret;
    } else {
      delete process.env.STRIPE_WEBHOOK_SECRET;
    }
    if (originalKey) {
      process.env.STRIPE_SECRET_KEY = originalKey;
    } else {
      delete process.env.STRIPE_SECRET_KEY;
    }
    jest.resetModules();
  });

  test("uses mock secret in test env", () => {
    process.env.NODE_ENV = "test";
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const cfg = require("../config");
    expect(cfg.stripeWebhook).toBe(mockSecrets.STRIPE_WEBHOOK_SECRET);
  });

  test("throws in production without live secret", () => {
    process.env.NODE_ENV = "production";
    delete process.env.STRIPE_WEBHOOK_SECRET;
    process.env.STRIPE_SECRET_KEY = "sk_live_dummy";
    expect(() => require("../config")).toThrow(
      "STRIPE_WEBHOOK_SECRET must be a live webhook secret",
    );
  });
});
