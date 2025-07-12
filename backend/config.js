"use strict";
const { getEnv } = require("./utils/getEnv");

const optionalGlb = [
  "CLOUDFRONT_MODEL_DOMAIN",
  "SPARC3D_ENDPOINT",
  "SPARC3D_TOKEN",
];

const missingGlb = optionalGlb.filter((key) => !process.env[key]);
if (missingGlb.length) {
  console.warn(`Missing optional GLB env vars: ${missingGlb.join(", ")}`);
}

module.exports = {
  dbUrl: getEnv("DB_URL"),
  stripeKey: getEnv("STRIPE_SECRET_KEY"),
  stripeWebhook: getEnv("STRIPE_WEBHOOK_SECRET"),
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
