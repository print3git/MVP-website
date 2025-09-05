// backend/tests/setupEnv.js
// Jest setup file for environment variables
process.env.STRIPE_PUBLISHABLE_KEY = "test_key";
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "sk_test_mock";
process.env.STRIPE_WEBHOOK_SECRET =
  process.env.STRIPE_WEBHOOK_SECRET || "whsec_mock";
process.env.FRONTEND_SUCCESS_URL =
  process.env.FRONTEND_SUCCESS_URL || "https://example.com/success";
process.env.FRONTEND_CANCEL_URL =
  process.env.FRONTEND_CANCEL_URL || "https://example.com/cancel";
