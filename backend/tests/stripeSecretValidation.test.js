const { mockSecrets } = require("../src/lib/mockEnv");

describe("Stripe webhook secret validation", () => {
  const { env } = process;
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...env };
    process.env.DB_URL = "postgres://user:pass@localhost/db";
    process.env.STRIPE_SECRET_KEY = "sk_live_valid";
  });

  afterEach(() => {
    process.env = env;
  });

  test("uses mock webhook secret in test env", () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    jest.isolateModules(() => {
      const config = require("../config");
      expect(config.stripeWebhook).toBe(mockSecrets.STRIPE_WEBHOOK_SECRET);
    });
  });

  describe("production", () => {
    beforeEach(() => {
      delete process.env.CI;
      process.env.NODE_ENV = "production";
      process.env.CI_REQUIRE_EXTERNAL = "1";
    });

    test("accepts real webhook secret", () => {
      process.env.STRIPE_WEBHOOK_SECRET = "whsec_real_secret";
      jest.isolateModules(() => {
        const cfg = require("../config");
        expect(cfg.stripeWebhook).toBe("whsec_real_secret");
      });
    });

    test("fails when webhook secret missing", () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;
      jest.isolateModules(() => {
        expect(() => require("../config")).toThrow(
          "STRIPE_WEBHOOK_SECRET must be a live webhook secret",
        );
      });
    });

    test("fails when webhook secret is mock", () => {
      process.env.STRIPE_WEBHOOK_SECRET = mockSecrets.STRIPE_WEBHOOK_SECRET;
      jest.isolateModules(() => {
        expect(() => require("../config")).toThrow(
          "STRIPE_WEBHOOK_SECRET must be a live webhook secret",
        );
      });
    });

    test("fails when webhook secret has wrong format", () => {
      process.env.STRIPE_WEBHOOK_SECRET = "not_a_whsec";
      jest.isolateModules(() => {
        expect(() => require("../config")).toThrow(
          "STRIPE_WEBHOOK_SECRET must be a live webhook secret",
        );
      });
    });
  });
});
