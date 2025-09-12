// backend/tests/setupGlobals.js
// Disable Jest global object deletion warnings by turning off the deletion mode
global[Symbol.for("$$jest-deletion-mode")] = "off";

const dotenv = require("dotenv");
const path = require("path");
const originalDotenvConfig = dotenv.config;
dotenv.config = (options = {}) =>
  originalDotenvConfig({ quiet: true, ...options });
dotenv.config({ path: path.resolve(__dirname, "../../.env.test") });

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "test";
}

const originalEmitWarning = process.emitWarning;
process.emitWarning = (warning, ...args) => {
  const msg = typeof warning === "string" ? warning : warning?.message;
  if (
    msg &&
    msg.includes("_currentOriginData") &&
    msg.includes("soft deleted")
  ) {
    return;
  }
  return originalEmitWarning.call(process, warning, ...args);
};

const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  if (
    args[0] &&
    typeof args[0] === "string" &&
    args[0].includes("_currentOriginData") &&
    args[0].includes("soft deleted")
  ) {
    return;
  }
  if (
    args[0] &&
    typeof args[0] === "string" &&
    args[0].includes("non-retryable streaming request")
  ) {
    return;
  }
  return originalConsoleWarn(...args);
};

if (!process.env.CLOUDFRONT_MODEL_DOMAIN) {
  process.env.CLOUDFRONT_MODEL_DOMAIN = "cdn.test";
}
if (!process.env.SPARC3D_ENDPOINT) {
  process.env.SPARC3D_ENDPOINT = "http://sparc3d.test";
}
if (!process.env.SPARC3D_TOKEN) {
  process.env.SPARC3D_TOKEN = "token";
}

// Provide dummy frontend URLs for Stripe checkout
if (!process.env.FRONTEND_SUCCESS_URL) {
  process.env.FRONTEND_SUCCESS_URL = "https://example.com/success";
}
if (!process.env.FRONTEND_CANCEL_URL) {
  process.env.FRONTEND_CANCEL_URL = "https://example.com/cancel";
}

if (!process.env.CI_REQUIRE_EXTERNAL) {
  process.env.CI_REQUIRE_EXTERNAL = "0";
}

// Provide dummy AWS credentials so tests don't need real ones
if (!process.env.AWS_ACCESS_KEY_ID) {
  process.env.AWS_ACCESS_KEY_ID = "test";
}
if (!process.env.AWS_SECRET_ACCESS_KEY) {
  process.env.AWS_SECRET_ACCESS_KEY = "test";
}
if (!process.env.DB_URL) {
  process.env.DB_URL = "postgres://user:pass@localhost/db";
}
const { applyMockEnv, mockSecrets } = require("../src/lib/mockEnv");
applyMockEnv();
const stripeKey =
  process.env.STRIPE_SECRET_KEY || mockSecrets.STRIPE_SECRET_KEY;
const webhook =
  process.env.STRIPE_WEBHOOK_SECRET || mockSecrets.STRIPE_WEBHOOK_SECRET;
if (!process.env.STRIPE_SECRET_KEY) {
  process.env.STRIPE_SECRET_KEY = stripeKey;
}
if (!process.env.STRIPE_PUBLISHABLE_KEY) {
  process.env.STRIPE_PUBLISHABLE_KEY = "pk_live";
}
global.__STRIPE_ENV__ = { stripeKey, stripeWebhook: webhook };

// Ensure any proxy environment variables do not interfere with HTTP mocking
for (const key of [
  "http_proxy",
  "https_proxy",
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "npm_config_http_proxy",
  "npm_config_https_proxy",
]) {
  delete process.env[key];
}
