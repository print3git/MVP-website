'use strict';
const required = ['DB_URL', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'HUNYUAN_API_KEY'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  throw new Error(`Missing required env vars: ${missing.join(', ')}`);
}
module.exports = {
  dbUrl: process.env.DB_URL,
  stripeKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhook: process.env.STRIPE_WEBHOOK_SECRET,
  hunyuanApiKey: process.env.HUNYUAN_API_KEY,
  hunyuanServerUrl: process.env.HUNYUAN_SERVER_URL || 'http://localhost:4000',
  port: process.env.PORT || 3000,
};
