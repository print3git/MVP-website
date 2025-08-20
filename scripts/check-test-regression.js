#!/usr/bin/env node
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const baselinePath = path.join(repoRoot, "tests", "testBaseline.json");
let baseline = { numFailedTests: 0 };
if (fs.existsSync(baselinePath)) {
  try {
    baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
  } catch (err) {
    console.error("Failed to read baseline:", err);
  }
}

const resultsPath = path.join(repoRoot, "test-results.json");
spawnSync(
  "node",
  ["scripts/run-jest.js", "--json", `--outputFile=${resultsPath}`],
  { cwd: repoRoot, stdio: "inherit" },
);

let results = { numFailedTests: Infinity };
try {
  results = JSON.parse(fs.readFileSync(resultsPath, "utf8"));
} catch (err) {
  console.error("Failed to read test results:", err);
}

if (results.numFailedTests > baseline.numFailedTests) {
  console.error(
    `Test failures increased. Current: ${results.numFailedTests}, baseline: ${baseline.numFailedTests}`,
  );
  process.exit(1);
}
console.log(
  `Jest failures ${results.numFailedTests} within baseline ${baseline.numFailedTests}`,
);
