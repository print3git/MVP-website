const fs = require("fs");
const path = require("path");
const child_process = require("child_process");
const origSpawnSync = child_process.spawnSync;

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
  if (cmd.includes("ensure-deps.js")) {
    const repoRoot = path.join(__dirname, "..", "..");
    const jestBin = path.join(
      repoRoot,
      "backend",
      "node_modules",
      ".bin",
      "jest",
    );
    try {
      fs.mkdirSync(path.dirname(jestBin), { recursive: true });
      fs.writeFileSync(jestBin, "#!/usr/bin/env node\n", { mode: 0o755 });
    } catch {
      // ignore errors creating stub jest binary
    }
  }
  return Buffer.from("");
};

child_process.spawnSync = function (cmd, args, opts = {}) {
  if (cmd.includes("jest")) {
    const stdout = "TN:\nSF:dummy\nend_of_record\n";
    return {
      status: 0,
      stdout,
      stderr: "",
      pid: 0,
      output: [null, stdout, ""],
    };
  }
  return origSpawnSync(cmd, args, opts);
};

if (process.env.FAKE_NODE_MODULES_MISSING) {
  const origExists = fs.existsSync;
  fs.existsSync = (p) => {
    if (p.includes("node_modules")) return false;
    return origExists(p);
  };
}

module.exports = { logFile };
