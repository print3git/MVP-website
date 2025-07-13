#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const summaryPath = path.join(
  __dirname,
  "..",
  "backend",
  "coverage",
  "coverage-summary.json",
);
if (!fs.existsSync(summaryPath)) {
  console.error(`Coverage summary not found: ${summaryPath}`);
  process.exit(1);
}
const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
const total = summary.total;
const jestConfig = require("../jest.config.js");
const thresholds =
  (jestConfig.coverageThreshold && jestConfig.coverageThreshold.global) || {};

let ok = true;
for (const metric of ["lines", "branches", "functions", "statements"]) {
  const required = thresholds[metric] ?? 0;
  const actual = (total[metric] && total[metric].pct) || 0;
  if (actual < required) {
    console.error(`${metric} coverage ${actual}% is below ${required}%`);
    ok = false;
  }
}
if (!ok) {
  process.exit(1);
}
console.log("Coverage check passed");
