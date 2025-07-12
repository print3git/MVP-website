#!/usr/bin/env node
const { execSync } = require('child_process');

function hostDepsInstalled() {
  try {
    const out = execSync('npx playwright install --with-deps --dry-run', { encoding: 'utf8' });
    return !/Missing libraries/i.test(out);
  } catch {
    return false;
  }
}

if (!hostDepsInstalled()) {
  console.log('Playwright host dependencies missing. Installing...');
  try {
    execSync('CI=1 npx playwright install --with-deps', { stdio: 'inherit' });
  } catch (err) {
    console.error('Failed to install Playwright host dependencies:', err.message);
    process.exit(1);
  }
} else {
  console.log('Playwright host dependencies already satisfied.');
}
