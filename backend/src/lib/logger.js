const Sentry = require("@sentry/node");
let initialized = false;
function ensureInit() {
  const dsn = process.env.SENTRY_DSN;
  if (dsn && !initialized) {
    Sentry.init({ dsn });
    initialized = true;
  }
  return Boolean(dsn);
}

function capture(error) {
  if (ensureInit()) {
    Sentry.captureException(error);
  }
}

module.exports = { capture };
