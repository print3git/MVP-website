const { applyMockEnv, mockSecrets } = require("../src/lib/mockEnv");

describe("mock environment defaults", () => {
  const keys = [
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "CF_PAGES_API_TOKEN",
    "CLOUDFRONT_MODEL_DOMAIN",
  ];
  afterEach(() => {
    for (const key of keys) {
      delete process.env[key];
    }
    jest.resetModules();
  });

  test("applies defaults when secrets are missing", () => {
    applyMockEnv();
    for (const key of keys) {
      expect(process.env[key]).toBe(mockSecrets[key]);
    }
  });

  test("allows config to load without real secrets", () => {
    applyMockEnv();
    const config = require("../config");
    expect(config.stripeKey).toBe(mockSecrets.STRIPE_SECRET_KEY);
    expect(config.stripeWebhook).toBe(mockSecrets.STRIPE_WEBHOOK_SECRET);
  });

  test("does not override existing values", () => {
    process.env.STRIPE_SECRET_KEY = "real";
    applyMockEnv();
    expect(process.env.STRIPE_SECRET_KEY).toBe("real");
  });
});
