#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const files = [
  'coverage/coverage-summary.json',
  'frontend/coverage/coverage-summary.json',
  'backend/coverage/coverage-summary.json'
];

let totalCovered = 0;
let totalLines = 0;
const found = [];

for (const file of files) {
  const full = path.join(process.cwd(), file);
  if (fs.existsSync(full)) {
    try {
      const data = JSON.parse(fs.readFileSync(full, 'utf8'));
      const lines = data.total && data.total.lines;
      if (lines && typeof lines.covered === 'number' && typeof lines.total === 'number') {
        totalCovered += lines.covered;
        totalLines += lines.total;
        found.push(file);
      } else {
        console.warn(`Skipping ${file}: missing line data`);
      }
    } catch (err) {
      console.warn(`Skipping ${file}: ${err.message}`);
    }
  }
}

if (!found.length) {
  console.error('No coverage summaries found.');
  process.exit(1);
}

const pct = totalLines > 0 ? (totalCovered / totalLines) * 100 : 0;
const threshold = Number(process.env.MIN_COVERAGE || 0);

if (pct < threshold) {
  console.error(`Coverage ${pct.toFixed(2)}% is below threshold ${threshold}%`);
  process.exit(1);
}

console.log(`Coverage ${pct.toFixed(2)}% meets threshold ${threshold}%`);
