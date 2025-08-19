"use strict";

const { getEnv } = require("./src/lib/getEnv");
const required = ["DB_URL", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"];
const isPlaceholder = (val, ending) =>
  !val ||
  val === "your_stripe_key_here" ||
  val === ending ||
  val.endsWith(ending);
const optionalGlb = [
  "CLOUDFRONT_MODEL_DOMAIN",
  "SPARC3D_ENDPOINT",
  "SPARC3D_TOKEN",
];

const missing = required.filter((key) => !getEnv(key));
if (missing.length) {
  console.warn(`Missing required env vars: ${missing.join(", ")}`);
}
const missingGlb = optionalGlb.filter((key) => !getEnv(key));
if (missingGlb.length) {
  console.warn(`Missing optional GLB env vars: ${missingGlb.join(", ")}`);
}

const stripeKey = getEnv("STRIPE_SECRET_KEY");
if (isPlaceholder(stripeKey, "sk_test")) {
  throw new Error("STRIPE_SECRET_KEY must be a live secret key");
}
const stripeWebhook = getEnv("STRIPE_WEBHOOK_SECRET");
if (isPlaceholder(stripeWebhook, "whsec")) {
  throw new Error("STRIPE_WEBHOOK_SECRET must be a live webhook secret");
}

module.exports = {
  dbUrl: getEnv("DB_URL"),
  stripeKey,
  stripeWebhook,
  stripePublishable: getEnv("STRIPE_PUBLISHABLE_KEY", { default: "" }),
  dalleServerUrl: getEnv("DALLE_SERVER_URL", {
    default: "http://localhost:5002",
  }),
  port: parseInt(getEnv("PORT", { default: 3000 }), 10),
  sendgridKey: getEnv("SENDGRID_API_KEY", { default: "" }),
  emailFrom: getEnv("EMAIL_FROM", { default: "noreply@example.com" }),
  printerApiUrl: getEnv("PRINTER_API_URL", {
    default: "http://localhost:5000/print",
  }),

  cloudfrontModelDomain: getEnv("CLOUDFRONT_MODEL_DOMAIN"),
  sparc3dEndpoint: getEnv("SPARC3D_ENDPOINT"),
  sparc3dToken: getEnv("SPARC3D_TOKEN"),
};
