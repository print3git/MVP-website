process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.DB_URL = process.env.DB_URL || "postgres://user:pass@localhost/db";
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "sk_test_mock";
process.env.STRIPE_PUBLISHABLE_KEY =
  process.env.STRIPE_PUBLISHABLE_KEY || "test_key";
process.env.FRONTEND_SUCCESS_URL =
  process.env.FRONTEND_SUCCESS_URL || "https://print2.io/index.html";
process.env.FRONTEND_CANCEL_URL =
  process.env.FRONTEND_CANCEL_URL || "https://print2.io/payment.html";
