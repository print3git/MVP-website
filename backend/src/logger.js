const { createLogger, format, transports } = require("winston");

const isTest = process.env.NODE_ENV === "test";
const level = process.env.LOG_LEVEL || (isTest ? "error" : "info");

const consoleTransport = new transports.Console({ silent: isTest });

const logger = createLogger({
  level,
  format: format.combine(format.timestamp(), format.json()),
  transports: [consoleTransport],
});

if (isTest) {
  ["info", "warn", "error"].forEach((method) => {
    const orig = logger[method].bind(logger);
    logger[method] = (...args) => {
      const consoleMethod = method === "info" ? "log" : method;
      console[consoleMethod](...args);
      return orig(...args);
    };
  });
}

module.exports = logger;
