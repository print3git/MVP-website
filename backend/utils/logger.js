const { createLogger, format, transports } = require("winston");
const path = require("path");

const logger = createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: format.combine(
    format.timestamp(),
    format.printf(({ timestamp, level, message, ...meta }) => {
      const rest = Object.keys(meta).length ? JSON.stringify(meta) : "";
      return `${timestamp} ${level}: ${message}${rest ? " " + rest : ""}`;
    }),
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: path.join(__dirname, "../logs/app.log") }),
  ],
});

module.exports = logger;
