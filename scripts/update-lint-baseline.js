#!/usr/bin/env node
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const baselinePath = path.join(repoRoot, "tests", "lintBaseline.json");

const output = execSync("pnpm exec eslint . -f json", {
  cwd: repoRoot,
  encoding: "utf8",
});
const results = JSON.parse(output);
const counts = results.reduce(
  (acc, r) => {
    acc.errorCount += r.errorCount || 0;
    acc.warningCount += r.warningCount || 0;
    return acc;
  },
  { errorCount: 0, warningCount: 0 },
);

fs.writeFileSync(baselinePath, JSON.stringify(counts, null, 2));
console.log(`Updated lint baseline at ${baselinePath}`);
