#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const DRY_RUN = process.env.ASSERT_SETUP_DRY_RUN;

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
  const skipDeps = browsersInstalled() ? 'SKIP_PW_DEPS=1 ' : '';
  console.log(
    `Playwright browsers ${browsersInstalled() ? 'already' : 'not'} installed. Running '${skipDeps}npm run setup'`
  );
  const cmd = `CI=1 ${skipDeps}npm run setup`;
  if (DRY_RUN) {
    console.log(`[dry-run] ${cmd}`);
  } else {
    try {
      require('child_process').execSync(cmd, { stdio: 'inherit' });
    } catch (err) {
      console.error('Failed to run setup:', err.message);
      process.exit(1);
    }
  }
}
