const { createLogger, format, transports } = require("winston");

const { combine, timestamp, json, colorize, printf } = format;

const level = process.env.LOG_LEVEL || "info";
const env = process.env.NODE_ENV || "development";
const isProduction = env === "production";
const isTest = env === "test";

const consoleFormat = isProduction
  ? combine(timestamp(), json())
  : combine(
      colorize(),
      timestamp(),
      printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length
          ? ` ${JSON.stringify(meta)}`
          : "";
        return `${timestamp} ${level}: ${message}${metaStr}`;
      }),
    );

const baseLogger = createLogger({
  level,
  transports: [
    new transports.Console({
      format: consoleFormat,
      silent: isTest,
    }),
  ],
});

const logger = {
  info: (msg, meta) => baseLogger.info(msg, meta),
  warn: (msg, meta) => baseLogger.warn(msg, meta),
  error: (msg, meta) => baseLogger.error(msg, meta),
  transports: baseLogger.transports,
};

module.exports = logger;
