"use strict";
const required = [
  "DB_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "CLOUDFRONT_MODEL_DOMAIN",
  "SPARC3D_ENDPOINT",
  "SPARC3D_TOKEN",
];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  throw new Error(`Missing required env vars: ${missing.join(", ")}`);
}
module.exports = {
  dbUrl: process.env.DB_URL,
  stripeKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhook: process.env.STRIPE_WEBHOOK_SECRET,
  stripePublishable: process.env.STRIPE_PUBLISHABLE_KEY || "",
  dalleServerUrl: process.env.DALLE_SERVER_URL || "http://localhost:5002",
  port: process.env.PORT || 3000,
  sendgridKey: process.env.SENDGRID_API_KEY || "",
  emailFrom: process.env.EMAIL_FROM || "noreply@example.com",
  printerApiUrl: process.env.PRINTER_API_URL || "http://localhost:5000/print",
  cloudfrontModelDomain: process.env.CLOUDFRONT_MODEL_DOMAIN,
  sparc3dEndpoint: process.env.SPARC3D_ENDPOINT,
  sparc3dToken: process.env.SPARC3D_TOKEN,
};
