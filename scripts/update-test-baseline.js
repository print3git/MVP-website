#!/usr/bin/env node
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const baselinePath = path.join(repoRoot, "tests", "testBaseline.json");
const resultsPath = path.join(repoRoot, "test-results.json");

spawnSync(
  "node",
  ["scripts/run-jest.js", "--json", `--outputFile=${resultsPath}`],
  { cwd: repoRoot, stdio: "inherit" },
);

const results = JSON.parse(fs.readFileSync(resultsPath, "utf8"));
fs.writeFileSync(
  baselinePath,
  JSON.stringify({ numFailedTests: results.numFailedTests }, null, 2),
);
console.log(`Updated test baseline at ${baselinePath}`);
