#!/usr/bin/env node
const fs = require("fs");
const os = require("os");
const path = require("path");

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

if (!fs.existsSync(".setup-complete") || !browsersInstalled()) {
  console.log(
    "Playwright browsers not installed. Running 'npm run setup' to install them",
  );
  try {
    require("child_process").execSync("CI=1 npm run setup", {
      stdio: "inherit",
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
    console.error("Failed to install dependencies:", err.message);
    process.exit(1);
  }
}
