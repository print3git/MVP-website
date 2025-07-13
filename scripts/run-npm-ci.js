const { execSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

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

function runNpmCi(dir = ".") {
  const options = { stdio: "inherit" };
  if (dir !== ".") options.cwd = dir;
  try {
    execSync("npm ci --no-audit --no-fund", options);
  } catch (err) {
    const output = String(err.stderr || err.stdout || err.message || "");
    if (output.includes("EUSAGE")) {
      console.warn(`npm ci failed in ${dir}, falling back to 'npm install'`);
      execSync("npm install --no-audit --no-fund", options);
      execSync("npm ci --no-audit --no-fund", options);
    } else if (/TAR_ENTRY_ERROR|ENOENT|tarball .*corrupted/.test(output)) {
      console.warn(
        `npm ci encountered tar errors in ${dir}. Cleaning cache and retrying...`,
      );
      cleanupNpmCache();
      fs.rmSync(path.join(dir, "node_modules"), {
        recursive: true,
        force: true,
      });
      execSync("npm ci --no-audit --no-fund", options);
    } else {
      throw err;
    }
  }
}

module.exports = { runNpmCi };
