const { getEnv } = require("../../backend/src/lib/getEnv");
const { mockSecrets } = require("../../backend/src/lib/mockEnv");

const requireExternal =
  process.env.NODE_ENV === "production" ||
  process.env.CI_REQUIRE_EXTERNAL === "1";

if (!requireExternal) {
  console.log(
    "diagnostic: mock Stripe secrets in use; skipping production gate",
  );
}

(requireExternal ? test : test.skip)(
  "production Stripe secrets are configured",
  () => {
    const stripeKey = getEnv("STRIPE_SECRET_KEY");
    const webhookSecret = getEnv("STRIPE_WEBHOOK_SECRET");

    const invalid = (val, prefix, mockVal) =>
      typeof val !== "string" ||
      !val.startsWith(prefix) ||
      val === mockVal ||
      /_(test|mock)/.test(val);

    if (invalid(stripeKey, "sk_", mockSecrets.STRIPE_SECRET_KEY)) {
      throw new Error(
        "STRIPE_SECRET_KEY must be a real key starting with 'sk_' (no test/mock placeholders)",
      );
    }

    if (invalid(webhookSecret, "whsec_", mockSecrets.STRIPE_WEBHOOK_SECRET)) {
      throw new Error(
        "STRIPE_WEBHOOK_SECRET must be a real key starting with 'whsec_' (no test/mock placeholders)",
      );
    }
  },
);
