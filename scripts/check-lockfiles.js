#!/usr/bin/env node
const { execSync } = require('child_process');

const dirs = ['.', 'backend', 'backend/dalle_server'];
let failed = false;

for (const dir of dirs) {
  try {
    execSync('npm ci --dry-run --ignore-scripts', { cwd: dir, stdio: 'inherit' });
  } catch {
    console.error(`Lockfile out of sync in ${dir}. Run 'npm install' in that directory.`);
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
