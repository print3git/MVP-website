// backend/tests/setupGlobals.js
// Disable Jest global object deletion warnings by turning off the deletion mode
global[Symbol.for("$$jest-deletion-mode")] = "off";

const dotenv = require("dotenv");
const originalDotenvConfig = dotenv.config;
dotenv.config = (options = {}) =>
  originalDotenvConfig({ quiet: true, ...options });

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
