const Sentry = require("@sentry/node");
const httpContext = require("express-http-context");
const dsn = process.env.SENTRY_DSN;
if (dsn) {
  Sentry.init({ dsn });
}
function capture(error) {
  if (dsn) {
    Sentry.captureException(error);
  }
}

function log(...args) {
  const id = httpContext.get("requestId");
  if (id) {
    console.log(`[${id}]`, ...args);
  } else {
    console.log(...args);
  }
}

module.exports = { capture, log };
