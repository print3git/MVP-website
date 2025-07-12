#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const backendPackage = path.join(repoRoot, 'backend', 'package.json');
const rootPackage = path.join(repoRoot, 'package.json');

if (!fs.existsSync(rootPackage)) {
  console.error('Error: package.json not found. Ensure you are in the repository root.');
  process.exit(1);
}

if (!fs.existsSync(backendPackage)) {
  console.error('Error: backend/package.json not found. Check that the repository is cloned correctly');
  process.exit(1);
}
