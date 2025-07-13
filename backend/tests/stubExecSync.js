const fs = require("fs");
const child_process = require("child_process");

let logFile = process.env.EXEC_LOG_FILE;
child_process.execSync = function (cmd, _opts) {
  if (logFile) {
    try {
      fs.appendFileSync(logFile, cmd + "\n");
    } catch (_err) {
      // ignore logging errors
    }
  }
  if (cmd.includes("playwright install")) {
    return Buffer.from("Playwright host dependencies already satisfied.");
  }
  return Buffer.from("");
};

module.exports = { logFile };
