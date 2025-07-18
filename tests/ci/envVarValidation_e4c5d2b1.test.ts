const checks = {
  DB_URL: /:\/\//,
  STRIPE_SECRET_KEY: /^sk_test_/,
  STRIPE_PUBLISHABLE_KEY: /^pk_test_/,
  STRIPE_WEBHOOK_SECRET: /^whsec_/,
};

describe("CI env var validation", () => {
  for (const [name, pattern] of Object.entries(checks)) {
    test(`${name} is set and matches ${pattern}`, () => {
      const value = process.env[name];
      if (!value) {
        throw new Error(`Missing required env var: ${name}`);
      }
      if (!pattern.test(value)) {
        throw new Error(`Invalid format for ${name}: ${value}`);
      }
    });
  }

  test("running in CI context", () => {
    expect(process.env.NODE_ENV).not.toBe("production");
  });
});
