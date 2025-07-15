const Sentry = require("@sentry/node");

let initialized = false;

function capture(error) {
  const dsn = process.env.SENTRY_DSN;
  if (dsn) {
    if (!initialized) {
      Sentry.init({ dsn });
      initialized = true;
    }
    Sentry.captureException(error);
  }
}

module.exports = { capture };
