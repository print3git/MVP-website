#!/usr/bin/env node
const fs = require("fs");
const os = require("os");
const path = require("path");
const child_process = require("child_process");
const { runNpmCi } = require("./run-npm-ci.js");

// Ensure this script runs from the repo root so relative paths work
const repoRoot = path.resolve(__dirname, "..");
if (process.cwd() !== repoRoot) {
  process.chdir(repoRoot);
}

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx);
    const value = line.slice(idx + 1);
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

if (fs.existsSync(".env")) {
  loadEnvFile(".env");
} else if (fs.existsSync(".env.example")) {
  loadEnvFile(".env.example");
}

try {
  child_process.execSync(
    "SKIP_NET_CHECKS=1 SKIP_DB_CHECK=1 bash scripts/validate-env.sh >/dev/null",
    { stdio: "inherit" },
  );
} catch (err) {
  console.error("Environment validation failed:", err.message);
  process.exit(1);
}

try {
  child_process.execSync("mise trust .mise.toml >/dev/null 2>&1");
  child_process.execSync(
    "mise settings add idiomatic_version_file_enable_tools node --yes >/dev/null 2>&1",
  );
} catch {
  // ignore if mise is unavailable
}

const requiredMajor = 20;
const currentMajor = parseInt(process.versions.node.split(".")[0], 10);
if (currentMajor < requiredMajor) {
  console.error(
    `Node ${requiredMajor} or newer is required. Current version: ${process.versions.node}`,
  );
  process.exit(1);
}

const requiredEnv = ["HF_TOKEN", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"];
for (const name of requiredEnv) {
  if (!process.env[name]) {
    console.error(`Environment variable ${name} must be set`);
    process.exit(1);
  }
}

if (!process.env.SKIP_NET_CHECKS) {
  try {
    require("child_process").execSync("node scripts/network-check.js", {
      stdio: "inherit",
    });
  } catch (err) {
    console.error("Network check failed:", err.message);
    process.exit(1);
  }
} else {
  console.log("Skipping network check due to SKIP_NET_CHECKS");
}

// Ensure required root dependencies are installed with retry logic
require("./ensure-root-deps.js");

function rootDepsInstalled() {
  try {
    const pw = fs.existsSync(path.join("node_modules", ".bin", "playwright"));
    const cl = fs.existsSync(path.join("node_modules", ".bin", "commitlint"));
    return pw && cl;
  } catch {
    return false;
  }
}

if (!rootDepsInstalled()) {
  console.log("Root dependencies missing. Installing...");
  try {
    runNpmCi();
  } catch (err) {
    const msg = String(err.message || err);
    if (msg.includes("EUSAGE")) {
      console.warn("npm ci failed, falling back to 'npm install'");
      try {
        child_process.execSync("npm install", { stdio: "inherit" });
      } catch (err2) {
        console.error("Failed to install dependencies:", err2.message);
        process.exit(1);
      }
    } else if (/(TAR_ENTRY_ERROR|ENOENT|ENOTEMPTY)/.test(msg)) {
      console.warn("npm ci encountered tar errors. Retrying after cleanup...");
      try {
        child_process.execSync(
          "npx --yes rimraf@5 node_modules backend/node_modules",
          { stdio: "inherit" },
        );
      } catch {
        child_process.execSync("rm -rf node_modules backend/node_modules", {
          stdio: "inherit",
        });
      }
      try {
        child_process.execSync("npm ci", { stdio: "inherit" });
      } catch (err2) {
        console.error("Failed to reinstall dependencies:", err2.message);
        process.exit(1);
      }
    } else {
      console.error("Failed to install dependencies:", err.message);
      process.exit(1);
    }
  }
}

function browsersInstalled() {
  const envPath = process.env.PLAYWRIGHT_BROWSERS_PATH;
  const defaultPath = path.join(os.homedir(), ".cache", "ms-playwright");
  const browserPath = envPath || defaultPath;
  try {
    return fs.existsSync(browserPath) && fs.readdirSync(browserPath).length > 0;
  } catch {
    return false;
  }
}

try {
  require("child_process").execSync("node scripts/check-host-deps.js", {
    stdio: "inherit",
  });
} catch (err) {
  console.error("Failed to verify Playwright host dependencies:", err.message);
  process.exit(1);
}

if (!fs.existsSync(".setup-complete") || !browsersInstalled()) {
  console.log(
    "Playwright browsers not installed. Running 'bash scripts/setup.sh' to install them",
  );
  try {
    const env = { ...process.env };
    delete env.npm_config_http_proxy;
    delete env.npm_config_https_proxy;
    delete env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD;
    require("child_process").execSync("CI=1 npm run setup", {
      stdio: "inherit",
      env,
    });
  } catch (err) {
    console.error("Failed to run setup:", err.message);
    process.exit(1);
  }
}

function jestInstalled() {
  try {
    return (
      fs.existsSync(path.join("node_modules", ".bin", "jest")) ||
      fs.existsSync(path.join("backend", "node_modules", ".bin", "jest"))
    );
  } catch {
    return false;
  }
}

function pluginInstalled() {
  try {
    require.resolve("@babel/plugin-syntax-typescript");
    return true;
  } catch {
    return false;
  }
}

if (!jestInstalled() || !pluginInstalled()) {
  console.log("Dependencies missing. Installing root dependencies...");
  try {
    runNpmCi();
  } catch (err) {
    console.error("Failed to install dependencies:", err.message);
    process.exit(1);
  }
}
