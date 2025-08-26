/**
 * Global Jest test env setup.
 */
try {
  require('dotenv').config();
} catch (_) {}

if (!process.env.STRIPE_SECRET_KEY) {
  process.env.STRIPE_SECRET_KEY = 'sk_test';
}
if (!process.env.STRIPE_WEBHOOK_SECRET) {
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
}
if (!process.env.S3_BUCKET) {
  process.env.S3_BUCKET = 'test-bucket';
}
