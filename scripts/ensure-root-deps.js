const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const os = require("os");

const requiredMajor = parseInt(process.env.REQUIRED_NODE_MAJOR || "20", 10);
const currentMajor = parseInt(process.versions.node.split(".")[0], 10);
if (currentMajor < requiredMajor) {
  console.error(
    `Node ${requiredMajor} or newer is required. Current version: ${process.versions.node}`,
  );
  process.exit(1);
}

try {
  const repoRoot = path.join(__dirname, "..");
  spawnSync("mise", ["trust", repoRoot], { stdio: "ignore" });
  const miseToml = path.join(repoRoot, ".mise.toml");
  if (fs.existsSync(miseToml)) {
    spawnSync("mise", ["trust", miseToml], { stdio: "ignore" });
  }
} catch {
  // ignore errors from mise trust to avoid masking real issues
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
    spawnSync("npm", ["cache", "clean", "--force"], { stdio: "ignore" });
  } catch {
    /* ignore */
  }
  try {
    const res = spawnSync("npm", ["config", "get", "cache"], {
      stdio: "pipe",
      encoding: "utf8",
      env: getEnv(),
    });
    const cacheDir = String(res.stdout || "").trim();
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
    spawnSync("npm", ["cache", "verify"], { stdio: "ignore" });
  } catch {
    /* ignore */
  }
}

function runNetworkCheck() {
  try {
    const r = spawnSync(process.execPath, [networkCheck], {
      stdio: "inherit",
      env: getEnv(),
    });
    if (r.status !== 0) throw new Error("network check failed");
  } catch {
    console.error(
      "Network check failed. Ensure access to the npm registry and Playwright CDN.",
    );
    process.exit(1);
  }
}

function canReachRegistry() {
  try {
    const r = spawnSync("npm", ["ping"], { stdio: "ignore", env: getEnv() });
    if (r.status !== 0) throw new Error("ping failed");
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
    const ping = spawnSync("npm", ["ping"], { stdio: "ignore", env: getEnv() });
    if (ping.status !== 0) throw new Error();
  } catch {
    console.error(
      "Unable to reach the npm registry. Check network connectivity or proxy settings.",
    );
    process.exit(1);
  }
  const install = () => {
    try {
      const r = spawnSync("npm", ["ci"], { stdio: "inherit", env: getEnv() });
      if (r.status === 0) return true;
      throw new Error("npm ci failed");
    } catch (err) {
      const msg = String(err.message || err);
      if (msg.includes("EUSAGE")) {
        console.warn("npm ci failed, falling back to 'npm install'");
        const res = spawnSync("npm", ["install"], {
          stdio: "inherit",
          env: getEnv(),
        });
        return res.status === 0;
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
