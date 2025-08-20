"use strict";

/**
 * Loads environment variables for the backend and applies fallbacks for local
 * development. Missing required variables are logged to the console.
 *
 * @module backend/config
 */
const { getEnv } = require("./src/lib/getEnv");
const { applyMockEnv, mockSecrets } = require("./src/lib/mockEnv");

applyMockEnv();

const required = ["DB_URL"];
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

const stripeKey = getEnv("STRIPE_SECRET_KEY", {
  defaultValue: mockSecrets.STRIPE_SECRET_KEY,
});
const stripeWebhook = getEnv("STRIPE_WEBHOOK_SECRET", {
  defaultValue: mockSecrets.STRIPE_WEBHOOK_SECRET,
});

const requireLive =
  process.env.NODE_ENV === "production" &&
  process.env.CI_REQUIRE_EXTERNAL === "1";
if (requireLive) {
  if (!/^sk_live/.test(stripeKey)) {
    throw new Error("STRIPE_SECRET_KEY must be a live secret");
  }
  if (!/^whsec_/.test(stripeWebhook)) {
    throw new Error("STRIPE_WEBHOOK_SECRET must be a live webhook secret");
  }
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
