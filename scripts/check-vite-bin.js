#!/usr/bin/env node
const { existsSync } = require('fs');
const { join } = require('path');

const vitePath = join(__dirname, '..', 'frontend', 'node_modules', '.bin', 'vite');

if (!existsSync(vitePath)) {
  console.error('vite not installed in frontend');
  process.exit(1);
}
