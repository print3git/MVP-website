#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

function summarize(lcovPath) {
  const data = fs.readFileSync(lcovPath, "utf8");
  const totals = {
    lines: { found: 0, hit: 0 },
    functions: { found: 0, hit: 0 },
    branches: { found: 0, hit: 0 },
  };
  for (const record of data.split("end_of_record")) {
    const lf = record.match(/LF:(\d+)/);
    const lh = record.match(/LH:(\d+)/);
    if (lf && lh) {
      totals.lines.found += Number(lf[1]);
      totals.lines.hit += Number(lh[1]);
    }
    const fnf = record.match(/FNF:(\d+)/);
    const fnh = record.match(/FNH:(\d+)/);
    if (fnf && fnh) {
      totals.functions.found += Number(fnf[1]);
      totals.functions.hit += Number(fnh[1]);
    }
    const brf = record.match(/BRF:(\d+)/);
    const brh = record.match(/BRH:(\d+)/);
    if (brf && brh) {
      totals.branches.found += Number(brf[1]);
      totals.branches.hit += Number(brh[1]);
    }
  }
  const pct = {
    lines: totals.lines.found
      ? (totals.lines.hit / totals.lines.found) * 100
      : 100,
    functions: totals.functions.found
      ? (totals.functions.hit / totals.functions.found) * 100
      : 100,
    branches: totals.branches.found
      ? (totals.branches.hit / totals.branches.found) * 100
      : 100,
  };
  pct.statements = pct.lines;
  return pct;
}

const [current, base] = process.argv.slice(2);
if (!current || !base) {
  console.error("Usage: coverage-diff <current-lcov> <base-lcov>");
  process.exit(1);
}
const cur = summarize(current);
const baseline = summarize(base);
const diffLines = [];
let failed = false;
for (const metric of ["lines", "functions", "branches", "statements"]) {
  const change = cur[metric] - baseline[metric];
  diffLines.push(
    `${metric}: ${baseline[metric].toFixed(2)}% -> ${cur[metric].toFixed(2)}% (${change.toFixed(2)}%)`,
  );
  if (change < -2) failed = true;
}
const output = diffLines.join("\n");
fs.mkdirSync(path.dirname("coverage/diff.txt"), { recursive: true });
fs.writeFileSync("coverage/diff.txt", output);
console.log(output);
if (failed) {
  process.exit(1);
}
