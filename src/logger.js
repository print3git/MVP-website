const isTest = process.env.NODE_ENV === "test";

/**
 * Write a structured log entry to the console.
 * @param {"info"|"warn"|"error"} level
 * @param {string} message
 * @param {object} [meta]
 * @returns {void}
 */
function output(level, message, meta = {}) {
  if (isTest) return;
  const entry = {
    level,
    message,
    ...meta,
    timestamp: new Date().toISOString(),
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

/**
 * Minimal logger interface used across the project. Methods are no-ops during
 * tests to keep output clean.
 */
const logger = {
  info: (msg, meta) => output("info", msg, meta),
  warn: (msg, meta) => output("warn", msg, meta),
  error: (msg, meta) => output("error", msg, meta),
  add: () => {},
  remove: () => {},
  transports: [],
  level: "info",
};

module.exports = logger;
