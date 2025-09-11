const modulePath = "../../src/routes/stripe/create-checkout-session";

const envKeys = [
  "STRIPE_TEST_KEY",
  "FRONTEND_SUCCESS_URL",
  "FRONTEND_CANCEL_URL",
];

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  jest.resetModules();
});

describe("create-checkout-session env requirements", () => {
  test("throws when required env vars are missing", () => {
    for (const key of envKeys) {
      delete process.env[key];
    }
    expect(() => require(modulePath)).toThrow();
  });
});
