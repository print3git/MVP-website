const fs = require("fs");
const child_process = require("child_process");
const origSpawnSync = child_process.spawnSync;
const path = require("path");

let logFile = process.env.EXEC_LOG_FILE;
if (logFile && !/^[\w./-]+$/.test(logFile)) {
  throw new Error("invalid log file path");
}
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

child_process.execFileSync = function (cmd, args = [], opts = {}) {
  const cwd = opts.cwd || process.cwd();
  const prefix = `[cwd:${cwd}] ${cmd} ${Array.isArray(args) ? args.join(" ") : ""}`;
  if (logFile) {
    try {
      fs.appendFileSync(logFile, prefix + "\n");
    } catch (_err) {
      // ignore logging errors
    }
  }
  const full = `${cmd} ${Array.isArray(args) ? args.join(" ") : ""}`;
  if (full.includes("playwright install")) {
    return Buffer.from("Playwright host dependencies already satisfied.");
  }
  if (process.env.FAIL_ENSURE_DEPS && full.includes("ensure-deps.js")) {
    const err = new Error("ensure-deps failed");
    err.status = 1;
    throw err;
  }
  return Buffer.from("");
};

child_process.spawnSync = function (cmd, args = [], opts = {}) {
  const cwd = opts.cwd || process.cwd();
  const prefix = `[cwd:${cwd}] ${cmd} ${Array.isArray(args) ? args.join(" ") : ""}`;
  if (logFile) {
    try {
      fs.appendFileSync(logFile, prefix + "\n");
    } catch (_err) {
      // ignore logging errors
    }
  }
  const full = `${cmd} ${Array.isArray(args) ? args.join(" ") : ""}`;
  if (full.includes("playwright install")) {
    return {
      status: 0,
      stdout: "Playwright host dependencies already satisfied.",
      stderr: "",
    };
  }
  if (cmd.includes("npm")) {
    return { status: 0, stdout: "", stderr: "" };
  }
  return origSpawnSync(cmd, args, opts);
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
