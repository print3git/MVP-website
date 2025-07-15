const Sentry = require("@sentry/node");

// In test environments, wrap captureException with a jest spy so tests can
// assert on calls even when they don't manually mock the function.
if (
  process.env.NODE_ENV === "test" &&
  typeof jest !== "undefined" &&
  !jest.isMockFunction(Sentry.captureException)
) {
  const original = Sentry.captureException.bind(Sentry);
  Sentry.captureException = jest.fn(original);
}

function capture(error) {
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error);
  }
}

module.exports = { capture };
