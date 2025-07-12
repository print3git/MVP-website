#!/usr/bin/env node
const fs = require("fs");
const os = require("os");
const path = require("path");

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

try {
  require("child_process").execSync("node scripts/network-check.js", {
    stdio: "inherit",
  });
} catch (err) {
  console.error("Network check failed:", err.message);
  process.exit(1);
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
    return fs.existsSync(path.join("node_modules", ".bin", "jest"));
  } catch {
    return false;
  }
}

if (!jestInstalled()) {
  console.log("Jest not found. Installing root dependencies...");
  try {
    require("child_process").execSync("npm ci", { stdio: "inherit" });
  } catch (err) {
    const msg = String(err.message || err);
    if (msg.includes("EUSAGE")) {
      console.warn("npm ci failed, falling back to 'npm install'");
      try {
        require("child_process").execSync("npm install", { stdio: "inherit" });
      } catch (err2) {
        console.error("Failed to install dependencies:", err2.message);
        process.exit(1);
      }
    } else {
      console.error("Failed to install dependencies:", err.message);
      process.exit(1);
    }
  }
}
