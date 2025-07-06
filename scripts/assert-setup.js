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
  console.log(
    "Playwright browsers not installed. Running 'npm run setup' to install them"
  );
  try {
    require('child_process').execSync('npm run setup', { stdio: 'inherit' });
  } catch (err) {
    console.error('Failed to run setup:', err.message);
    process.exit(1);
  }
}
