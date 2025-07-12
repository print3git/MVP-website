#!/usr/bin/env node
const { execSync } = require('child_process');

const targets = [
  { url: 'https://registry.npmjs.org', name: 'npm registry' },
  { url: 'https://cdn.playwright.dev', name: 'Playwright CDN' },
];

function check(url) {
  try {
    execSync(`curl -sI --max-time 10 ${url}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

for (const { url, name } of targets) {
  if (!check(url)) {
    console.error(`Unable to reach ${name}: ${url}`);
    process.exit(1);
  }
}
console.log('✅ network OK');
