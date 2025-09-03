const { execSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

function isOffline() {
  if (process.env.SKIP_NET_CHECKS === "1" || process.env.CI_NO_NET === "1") {
    return true;
  }
  try {
    execSync(
      "curl -sfI --max-time 10 https://registry.npmjs.org/-/ping >/dev/null 2>&1",
      { stdio: "ignore" },
    );
    return false;
  } catch {
    return true;
  }
}

function cleanupNpmCache() {
  try {
    execSync("npm cache clean --force", { stdio: "ignore" });
  } catch {
    /* ignore */
  }
  try {
    const cache = execSync("npm config get cache").toString().trim();
    fs.rmSync(path.join(cache, "_cacache"), { recursive: true, force: true });
    fs.rmSync(path.join(cache, "_cacache", "tmp"), {
      recursive: true,
      force: true,
    });
  } catch {
    /* ignore */
  }
  try {
    fs.rmSync(path.join(os.homedir(), ".npm", "_cacache"), {
      recursive: true,
      force: true,
    });
  } catch {
    /* ignore */
  }
}

function runNpmCi(dir = ".", opts = {}) {
  if (isOffline()) {
    console.log(
      `offline mode: skipping npm ci${dir !== "." ? ` in ${dir}` : ""}`,
    );
    return;
  }
  const options = { stdio: "inherit" };
  if (dir !== ".") options.cwd = dir;
  const ignoreScripts = opts.ignoreScripts || process.env.NPM_IGNORE_SCRIPTS;
  const ciCmd = `npm ci --no-audit --no-fund${ignoreScripts ? " --ignore-scripts" : ""}`;
  try {
    execSync(ciCmd, options);
  } catch (err) {
    const output = String(err.stderr || err.stdout || err.message || "");
    if (output.includes("EUSAGE")) {
      console.warn(`npm ci failed in ${dir}, falling back to 'npm install'`);
      const installCmd = `npm install --no-audit --no-fund${ignoreScripts ? " --ignore-scripts" : ""}`;
      execSync(installCmd, options);
      execSync(ciCmd, options);
    } else if (
      /TAR_ENTRY_ERROR|ENOENT|ENOTEMPTY|tarball .*corrupted/.test(output)
    ) {
      console.warn(
        `npm ci encountered tar errors in ${dir}. Cleaning cache and retrying...`,
      );
      cleanupNpmCache();
      fs.rmSync(path.join(dir, "node_modules"), {
        recursive: true,
        force: true,
      });
      execSync(ciCmd, options);
    } else {
      throw err;
    }
  }
}

module.exports = { runNpmCi };
