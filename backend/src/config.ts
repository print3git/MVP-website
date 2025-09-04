export function validateCriticalEnv() {
  const { STRIPE_SECRET_KEY, FRONTEND_SUCCESS_URL, FRONTEND_CANCEL_URL } =
    process.env;
  if (!STRIPE_SECRET_KEY || !FRONTEND_SUCCESS_URL || !FRONTEND_CANCEL_URL) {
    const msg =
      "Missing STRIPE_SECRET_KEY, FRONTEND_SUCCESS_URL, or FRONTEND_CANCEL_URL";
    if (process.env.NODE_ENV === "test") throw new Error(msg); // test-friendly
    // prod/runtime path:
    console.error(msg);
    process.exit(1);
  }
}
