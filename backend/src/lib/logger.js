const Sentry = require('@sentry/node');
const dsn = process.env.SENTRY_DSN;
if (dsn) {
  Sentry.init({ dsn });
}
function capture(error) {
  if (dsn) {
    Sentry.captureException(error);
  }
}
module.exports = { capture };
