#!/usr/bin/env node
const fs = require('fs');
if (!fs.existsSync('.setup-complete')) {
  console.error("Setup has not been run. Please execute 'npm run setup' first.");
  process.exit(1);
}
