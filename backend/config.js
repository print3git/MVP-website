'use strict';
const required = [
  'DB_URL',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'HUNYUAN_API_KEY',
  'CLOUDFRONT_MODEL_DOMAIN',
];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  throw new Error(`Missing required env vars: ${missing.join(', ')}`);
}
module.exports = {
  dbUrl: process.env.DB_URL,
  stripeKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhook: process.env.STRIPE_WEBHOOK_SECRET,
  stripePublishable: process.env.STRIPE_PUBLISHABLE_KEY || '',
  hunyuanApiKey: process.env.HUNYUAN_API_KEY,
  hunyuanServerUrl: process.env.HUNYUAN_SERVER_URL || 'http://localhost:4000',
  dalleServerUrl: process.env.DALLE_SERVER_URL || 'http://localhost:5002',
  port: process.env.PORT || 3000,
  sendgridKey: process.env.SENDGRID_API_KEY || '',
  emailFrom: process.env.EMAIL_FROM || 'noreply@example.com',
  printerApiUrl: process.env.PRINTER_API_URL || 'http://localhost:5000/print',
  cloudfrontModelDomain: process.env.CLOUDFRONT_MODEL_DOMAIN,
};
