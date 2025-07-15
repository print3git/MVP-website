const fs = require("fs");
const child_process = require("child_process");

let logFile = process.env.EXEC_LOG_FILE;
child_process.execSync = function (cmd, opts = {}) {
  const cwd = opts.cwd || process.cwd();
  const prefix = `[cwd:${cwd}] `;
  if (logFile) {
    try {
      fs.appendFileSync(logFile, prefix + cmd + "\n");
    } catch (_err) {
      // ignore logging errors
    }
  }
  if (cmd.includes("playwright install")) {
    return Buffer.from("Playwright host dependencies already satisfied.");
  }
  if (process.env.FAIL_ENSURE_DEPS && cmd.includes("ensure-deps.js")) {
    const err = new Error("ensure-deps failed");
    err.status = 1;
    throw err;
  }
  return Buffer.from("");
};

module.exports = { logFile };
