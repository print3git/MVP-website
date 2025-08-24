const { expect, test } = require("@jest/globals");

beforeEach(() => {
  process.env.STRIPE_TEST_KEY = "sk_test";
  process.env.STRIPE_LIVE_KEY = "sk_live";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec";
  jest.resetModules();
});

afterEach(() => {
  delete process.env.STRIPE_TEST_KEY;
  delete process.env.STRIPE_LIVE_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;
});

test("app uses the checkout router instance", () => {
  const { default: router, orders } = require("../src/routes/checkout");
  const app = require("../src/app");

  // Router should expose the same orders map exported from the module
  expect(router.orders).toBe(orders);

  // Express layers list the router handle
  const stack = app._router?.stack || app.router?.stack;
  const found = stack?.some((layer) => layer.handle === router);
  expect(found).toBe(true);
});
