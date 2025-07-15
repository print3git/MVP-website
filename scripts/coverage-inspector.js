#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const lcovPath =
  process.argv[2] ||
  path.join(__dirname, "..", "backend", "coverage", "lcov.info");

if (!fs.existsSync(lcovPath)) {
  console.error(`Coverage file not found: ${lcovPath}`);
  process.exit(1);
}

const data = fs.readFileSync(lcovPath, "utf8");

let linesHit = 0;
let linesFound = 0;
let funcsHit = 0;
let funcsFound = 0;
let branchesHit = 0;
let branchesFound = 0;

for (const line of data.split("\n")) {
  if (line.startsWith("LH:")) linesHit += parseInt(line.slice(3), 10);
  else if (line.startsWith("LF:")) linesFound += parseInt(line.slice(3), 10);
  else if (line.startsWith("FNH:")) funcsHit += parseInt(line.slice(4), 10);
  else if (line.startsWith("FNF:")) funcsFound += parseInt(line.slice(4), 10);
  else if (line.startsWith("BRH:")) branchesHit += parseInt(line.slice(4), 10);
  else if (line.startsWith("BRF:"))
    branchesFound += parseInt(line.slice(4), 10);
}

function pct(hit, found) {
  return found === 0 ? 100 : (hit / found) * 100;
}

const linesPct = pct(linesHit, linesFound);
const funcsPct = pct(funcsHit, funcsFound);
const branchesPct = pct(branchesHit, branchesFound);

console.log(`Lines: ${linesPct.toFixed(2)}%`);
console.log(`Functions: ${funcsPct.toFixed(2)}%`);
console.log(`Branches: ${branchesPct.toFixed(2)}%`);

if (linesPct >= 80 && funcsPct >= 80 && branchesPct >= 80) {
  console.log("✅");
} else {
  console.log("❌");
}
