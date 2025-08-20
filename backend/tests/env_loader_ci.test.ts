const path = require("path");

describe("env loader in CI", () => {
  const configPath = path.resolve(__dirname, "../config.js");

  afterEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    jest.resetModules();
  });

  test("falls back to mock secrets in test env", () => {
    process.env.NODE_ENV = "test";
    let cfg;
    expect(() => {
      cfg = require(configPath);
    }).not.toThrow();
    expect(cfg.stripeKey).toMatch(/^sk_test/);
    expect(cfg.stripeWebhook).toMatch(/^whsec_/);
  });
});

