const { createLogger, format, transports } = require("winston");

const isTest = process.env.NODE_ENV === "test";
const level = process.env.LOG_LEVEL || (isTest ? "error" : "info");

const logger = createLogger({
  level,
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console({ silent: isTest })],
});

module.exports = logger;
