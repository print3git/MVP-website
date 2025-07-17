#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
let min = 0;
for (const arg of args) {
  const match = arg.match(/^--min=(\d+)/);
  if (match) {
    min = parseInt(match[1], 10);
  }
}
if (!min) min = 0;

const summaryPath = path.join(
  __dirname,
  "..",
  "backend",
  "coverage",
  "coverage-summary.json",
);
if (!fs.existsSync(summaryPath)) {
  console.error(`Missing coverage summary: ${summaryPath}`);
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
const failures = [];
for (const [file, data] of Object.entries(report)) {
  if (file === "total") continue;
  const pct =
    data.branches && typeof data.branches.pct === "number"
      ? data.branches.pct
      : 100;
  if (pct < min) {
    failures.push(`${file}: ${pct}%`);
  }
}
if (failures.length) {
  console.error(`Files below ${min}% branch coverage:\n` + failures.join("\n"));
  process.exit(1);
}
console.log(`All files meet branch coverage >= ${min}%`);
