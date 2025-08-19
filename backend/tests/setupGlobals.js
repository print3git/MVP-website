// backend/tests/setupGlobals.js
// Disable Jest global object deletion warnings by turning off the deletion mode
global[Symbol.for("$$jest-deletion-mode")] = "off";

const { loadEnv } = require("../../test/envLoader");
loadEnv(process.env);

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

global.__STRIPE_ENV__ = {
  stripeKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhook: process.env.STRIPE_WEBHOOK_SECRET,
};

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
