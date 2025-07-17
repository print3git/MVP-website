#!/usr/bin/env node
const fs = require("fs");

// Parse CLI args
const args = process.argv.slice(2);
let reportPath = "./coverage/coverage-final.json";
let min = 90;
for (const arg of args) {
  if (arg.startsWith("--report=")) {
    reportPath = arg.split("=")[1];
  } else if (arg.startsWith("--min=")) {
    min = Number(arg.split("=")[1]);
  }
}

if (!fs.existsSync(reportPath)) {
  console.error(`Coverage report not found: ${reportPath}`);
  process.exit(1);
}

let coverage;
try {
  coverage = JSON.parse(fs.readFileSync(reportPath, "utf8"));
} catch (err) {
  console.error(`Failed to parse ${reportPath}: ${err.message}`);
  process.exit(1);
}

const results = [];
for (const file of Object.keys(coverage)) {
  const { branchMap, b } = coverage[file];
  const totalBranches = Object.keys(branchMap).length;
  const coveredBranches = b.flat().filter((hit) => hit > 0).length;
  const percent =
    totalBranches === 0 ? 100 : (coveredBranches / totalBranches) * 100;
  if (percent < min) {
    results.push({ file, totalBranches, coveredBranches, percent });
  }
}

if (results.length > 0) {
  console.log("| File | Covered / Total | % Branch |");
  console.log("| ---- | -------------- | -------- |");
  for (const r of results) {
    console.log(
      `| ${r.file} | ${r.coveredBranches} / ${r.totalBranches} | ${r.percent.toFixed(2)} |`,
    );
  }
  process.exit(1);
} else {
  console.log(`✅ All files meet branch coverage ≥ ${min}%`);
  process.exit(0);
}
