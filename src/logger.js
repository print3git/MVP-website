const { createLogger, format, transports } = require("winston");

const isTest = process.env.NODE_ENV === "test";
const level = process.env.LOG_LEVEL || (isTest ? "error" : "info");
const consoleTransport = new transports.Console({ silent: isTest });

const baseLogger = createLogger({
  level,
  format: format.combine(format.timestamp(), format.json()),
  transports: [consoleTransport],
});

// Format a log entry and send to console in JSON form
function output(level, msg, meta = {}) {
  const { code, ...rest } = meta;
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message: msg,
    ...(code ? { code } : {}),
    ...rest,
  };
  const str = JSON.stringify(entry);
  if (level === "error") {
    console.error(str);
  } else {
    console.log(str);
  }
  baseLogger.log({
    level,
    message: msg,
    ...(code ? { code } : {}),
    ...rest,
    timestamp: entry.timestamp,
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
