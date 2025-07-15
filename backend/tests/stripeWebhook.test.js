const config = require("../config");

test("test env provides STRIPE_WEBHOOK_SECRET", () => {
  expect(config.stripeWebhook).toBe("whsec");
});
