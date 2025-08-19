const env = global.__STRIPE_ENV__ || {};
const isPlaceholder = (val, ending) =>
  !val ||
  val === "your_stripe_key_here" ||
  val === ending ||
  val.endsWith(ending);

const missing = !env.stripeKey || !env.stripeWebhook;
if (missing) {
  console.log(
    "Skipping stripe environment variables test: STRIPE secrets missing",
  );
}

(missing ? describe.skip : describe)("stripe environment variables", () => {
  test("STRIPE_SECRET_KEY is not a placeholder", () => {
    expect(isPlaceholder(env.stripeKey, "sk_test")).toBe(false);
  });
  test("STRIPE_WEBHOOK_SECRET is not a placeholder", () => {
    expect(isPlaceholder(env.stripeWebhook, "whsec")).toBe(false);
  });
});
