const fs = require("fs");
const child_process = require("child_process");
const path = require("path");

let logFile = process.env.EXEC_LOG_FILE;
if (logFile && !/^[\w./-]+$/.test(logFile)) {
  throw new Error("invalid log file path");
}
function logCommand(cmd, cwd) {
  if (!logFile) return;
  try {
    fs.appendFileSync(logFile, `[cwd:${cwd}] ` + cmd + "\n");
  } catch {
    /* ignore */
  }
}

child_process.execSync = function (cmd, opts = {}) {
  const cwd = opts.cwd || process.cwd();
  logCommand(cmd, cwd);
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

child_process.spawnSync = function (cmd, args = [], opts = {}) {
  const cwd = (opts && opts.cwd) || process.cwd();
  const fullCmd = [cmd, ...(args || [])].join(" ");
  logCommand(fullCmd, cwd);
  if (/jest/.test(fullCmd)) {
    return { status: 0, stdout: "TN:\nend_of_record\n", stderr: "" };
  }
  return { status: 0, stdout: "", stderr: "" };
};

if (process.env.FAKE_NODE_MODULES_MISSING) {
  const origExists = fs.existsSync;
  fs.existsSync = (p) => {
    const abs = path.resolve(p);
    if (abs.includes("node_modules")) return false;
    return origExists(abs);
  };
}

module.exports = { logFile };
