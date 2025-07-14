#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const summaryFile = path.join("coverage", "coverage-summary.json");
let summary;
try {
  summary = JSON.parse(fs.readFileSync(summaryFile, "utf8"));
} catch {
  console.error(`Could not read ${summaryFile}`);
  process.exit(0);
}

const uncovered = [];
for (const [file, data] of Object.entries(summary)) {
  if (file === "total") continue;
  const pct = Math.min(data.lines.pct, data.statements.pct);
  if (pct < 80) {
    uncovered.push({ file, pct });
  }
}

if (uncovered.length) {
  console.log("Uncovered (<80%):\n");
  for (const u of uncovered) {
    console.log(`    ${u.file} (${u.pct.toFixed(1)}%)\n`);
  }
}
process.exit(0);
