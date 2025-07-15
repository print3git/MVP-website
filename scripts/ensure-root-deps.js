const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const os = require("os");

const requiredMajor = parseInt(process.env.REQUIRED_NODE_MAJOR || "20", 10);
const currentMajor = parseInt(process.versions.node.split(".")[0], 10);
if (currentMajor < requiredMajor) {
  console.error(
    `Node ${requiredMajor} or newer is required. Current version: ${process.versions.node}`,
  );
  process.exit(1);
}

function getEnv() {
  const env = { ...process.env };
  delete env.npm_config_http_proxy;
  delete env.npm_config_https_proxy;
  return env;
}

const pluginPath = path.join(
  __dirname,
  "..",
  "node_modules",
  "@babel",
  "plugin-syntax-typescript",
  "package.json",
);
const expressPath = path.join(
  __dirname,
  "..",
  "node_modules",
  "express",
  "package.json",
);
const playwrightPath = path.join(
  __dirname,
  "..",
  "node_modules",
  "playwright",
  "package.json",
);

const networkCheck = path.join(__dirname, "network-check.js");
const requiredPaths = [pluginPath, expressPath, playwrightPath];

function cleanupNpmCache() {
  try {
    execSync("npm cache clean --force", { stdio: "ignore" });
  } catch {
    /* ignore */
  }
  try {
    const cacheDir = execSync("npm config get cache", { stdio: "pipe" })
      .toString()
      .trim();
    const homeCache = path.join(os.homedir(), ".npm", "_cacache");
    for (const dir of [
      path.join(cacheDir, "_cacache"),
      homeCache,
      path.join(cacheDir, "_cacache", "tmp"),
      path.join(homeCache, "tmp"),
    ]) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  } catch {
    /* ignore */
  }
  try {
    execSync("npm cache verify", { stdio: "ignore" });
  } catch {
    /* ignore */
  }
}

function runNetworkCheck() {
  try {
    execSync(`node ${networkCheck}`, { stdio: "inherit", env: getEnv() });
  } catch {
    console.error(
      "Network check failed. Ensure access to the npm registry and Playwright CDN.",
    );
    process.exit(1);
  }
}

function canReachRegistry() {
  try {
    execSync("npm ping", { stdio: "ignore", env: getEnv() });
    return true;
  } catch {
    console.error(
      "Unable to reach the npm registry. Check network connectivity or proxy settings.",
    );
    return false;
  }
}

if (!requiredPaths.every((p) => fs.existsSync(p))) {
  runNetworkCheck();
  if (!canReachRegistry()) process.exit(1);
  console.log("Dependencies missing. Installing root dependencies...");
  cleanupNpmCache();
  try {
    execSync("npm ping", { stdio: "ignore", env: getEnv() });
  } catch {
    console.error(
      "Unable to reach the npm registry. Check network connectivity or proxy settings.",
    );
    process.exit(1);
  }
  const install = () => {
    try {
      execSync("npm ci", { stdio: "inherit", env: getEnv() });
      return true;
    } catch (err) {
      const msg = String(err.message || err);
      if (msg.includes("EUSAGE")) {
        console.warn("npm ci failed, falling back to 'npm install'");
        execSync("npm install", { stdio: "inherit", env: getEnv() });
        return true;
      }
      if (/TAR_ENTRY_ERROR|ENOENT|ENOTEMPTY|tarball .*corrupted/.test(msg)) {
        console.warn(
          "npm ci encountered tar or filesystem errors. Cleaning cache and retrying...",
        );
        cleanupNpmCache();
        try {
          fs.rmSync("node_modules", { recursive: true, force: true });
          fs.rmSync(path.join("backend", "node_modules"), {
            recursive: true,
            force: true,
          });
        } catch {
          /* ignore */
        }
        return false;
      }
      if (/ECONNRESET|ENOTFOUND|network|ETIMEDOUT/i.test(msg)) {
        return false;
      }
      console.error("Failed to install dependencies:", err.message);
      process.exit(1);
    }
  };

  for (let attempt = 1; attempt <= 3; attempt++) {
    if (install()) break;
    console.warn(`npm ci failed, retrying (${attempt}/3)...`);
    runNetworkCheck();
    if (attempt === 3) {
      console.error("Failed to install dependencies after multiple attempts.");
      process.exit(1);
    }
  }
}
