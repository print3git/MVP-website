const path = require("path");
require("dotenv").config({
  path: path.resolve(__dirname, "..", "..", ".env"),
  override: true,
});

test("Stripe key env present", () => {
  expect(
    process.env.STRIPE_TEST_KEY || process.env.STRIPE_LIVE_KEY,
  ).toBeDefined();
});
