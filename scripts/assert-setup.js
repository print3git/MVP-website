#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');

function browsersInstalled() {
  const envPath = process.env.PLAYWRIGHT_BROWSERS_PATH;
  const defaultPath = path.join(os.homedir(), '.cache', 'ms-playwright');
  const browserPath = envPath || defaultPath;
  try {
    return fs.existsSync(browserPath) && fs.readdirSync(browserPath).length > 0;
  } catch {
    return false;
  }
}

if (!fs.existsSync('.setup-complete') || !browsersInstalled()) {
  console.error(
    "Playwright browsers not installed. Please execute 'npm run setup' first."
  );
  process.exit(1);
}
