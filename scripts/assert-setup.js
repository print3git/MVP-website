#!/usr/bin/env node
const fs = require("fs");
const os = require("os");
const path = require("path");
if (!fs.existsSync(".setup-complete")) {
  console.error(
    "Setup has not been run. Please execute 'npm run setup' first.",
  );
  process.exit(1);
}

// Ensure Playwright browsers are available before running tests.
const pwDir = path.join(os.homedir(), ".cache", "ms-playwright");
if (!fs.existsSync(pwDir) || fs.readdirSync(pwDir).length === 0) {
  console.error(
    "Playwright browsers are missing. Please run 'npm run setup' to install them.",
  );
  process.exit(1);
}
