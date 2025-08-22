#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

function findPackageLockFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let result = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result = result.concat(findPackageLockFiles(full));
    } else if (entry.name === 'package-lock.json') {
      result.push(full);
    }
  }
  return result;
}

function main() {
  const rootLock = path.resolve('package-lock.json');
  if (fs.existsSync(rootLock)) {
    console.error('::error::package-lock.json found at repo root; canonical manager is pnpm');
    process.exit(1);
  }
  const locks = findPackageLockFiles('.');
  const nested = locks.filter(p => path.resolve(p) !== rootLock);
  if (nested.length > 0) {
    console.warn('::warning::Nested package-lock.json files detected. Add to allowlist if intentional.');
  }
}

if (require.main === module) {
  main();
}
