#!/usr/bin/env node
/**
 * Fails with a helpful message if package-lock.json is out of sync.
 * Auto-fix mode (`--write`) updates the lockfile in-place.
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

if (!existsSync('package-lock.json')) {
  console.error('❌  package-lock.json missing. Run: npm install');
  process.exit(1);
}

try {
  execSync('npm install --package-lock-only --ignore-scripts', { stdio: 'inherit' });
} catch {
  console.error('❌  Failed to regenerate lockfile.');
  process.exit(1);
}

const diff = execSync('git diff --name-only package-lock.json').toString().trim();
if (diff) {
  if (process.argv.includes('--write')) {
    execSync('git add package-lock.json');
    console.log('✅  Lockfile updated & staged.');
  } else {
    console.error('❌  package-lock.json is out of date.\n    Fix with: npm run fix-lockfile');
    process.exit(1);
  }
}
