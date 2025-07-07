// backend/tests/setupGlobals.js
// Disable Jest global object deletion warnings by turning off the deletion mode
global[Symbol.for("$$jest-deletion-mode")] = "off";

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
