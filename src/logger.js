const { createLogger, format, transports } = require("winston");

const isTest = process.env.NODE_ENV === "test";
const level = process.env.LOG_LEVEL || (isTest ? "error" : "info");
const consoleTransport = new transports.Console({ silent: isTest });

const logger = createLogger({
  level,
  format: format.combine(format.timestamp(), format.json()),
  transports: [consoleTransport],
});

// During tests, avoid writing to console to prevent Jest spies from failing
// when logger methods are invoked. The logger transport is already silenced
// in test mode, so we skip the console wrapper entirely.
if (!isTest) {
  ["info", "warn", "error"].forEach((method) => {
    const orig = logger[method].bind(logger);
    logger[method] = (...args) => {
      console[method](...args);
      return orig(...args);
    };
  });
}

module.exports = logger;
