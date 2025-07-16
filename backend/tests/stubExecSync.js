const fs = require("fs");
const child_process = require("child_process");
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

child_process.spawnSync = function (cmd, args = [], opts = {}) {
  const cwd = opts.cwd || process.cwd();
  const prefix = `[cwd:${cwd}] `;
  const joined = [cmd, ...(args || [])].join(" ");
  if (logFile) {
    try {
      fs.appendFileSync(logFile, prefix + joined + "\n");
    } catch (_err) {
      /* ignore */
    }
  }
  if (joined.includes("playwright install")) {
    return {
      status: 0,
      stdout: "Playwright host dependencies already satisfied.",
      stderr: "",
    };
  }
  if (joined.includes("node_modules/.bin/jest")) {
    const fsPath = require("path");
    const summaryPath = fsPath.join(process.cwd(), "backend", "coverage");
    try {
      fs.mkdirSync(summaryPath, { recursive: true });
      fs.writeFileSync(
        fsPath.join(summaryPath, "coverage-summary.json"),
        JSON.stringify({ total: {} }),
      );
    } catch (_) {
      /* ignore */
    }
    return {
      status: 0,
      stdout: "TN:\nSF:/dev/null\nend_of_record\n",
      stderr: "",
    };
  }
  if (process.env.FAIL_ENSURE_DEPS && joined.includes("ensure-deps.js")) {
    return { status: 1, stdout: "", stderr: "ensure-deps failed" };
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
