const { createLogger, format, transports } = require("winston");

const isTest = process.env.NODE_ENV === "test";
const level = process.env.LOG_LEVEL || (isTest ? "error" : "info");
const consoleTransport = new transports.Console({ silent: isTest });

const baseLogger = createLogger({
  level,
  format: format.combine(format.timestamp(), format.json()),
  transports: [consoleTransport],
});

/**
 * Format a log entry and forward it to winston.
 * @param {"info"|"warn"|"error"} level - log level for the message
 * @param {string} msg - message to log
 * @param {object} [meta] - additional metadata for the log entry
 * @returns {void}
 */
function output(level, msg, meta = {}) {
  const { code, ...rest } = meta;
  baseLogger.log({
    level,
    message: msg,
    ...(code ? { code } : {}),
    ...rest,
    timestamp: new Date().toISOString(),
  });
}

const logger = {
  info: (msg, meta) => {
    if (isTest) return baseLogger.info(msg, meta);
    output("info", msg, meta);
  },
  warn: (msg, meta) => {
    if (isTest) return baseLogger.warn(msg, meta);
    output("warn", msg, meta);
  },
  error: (msg, meta) => {
    if (isTest) return baseLogger.error(msg, meta);
    output("error", msg, meta);
  },
  add: (...args) => baseLogger.add(...args),
  remove: (...args) => baseLogger.remove(...args),
  transports: baseLogger.transports,
  level: baseLogger.level,
};

module.exports = logger;
