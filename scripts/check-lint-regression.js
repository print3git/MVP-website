#!/usr/bin/env node
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const baselinePath = path.join(repoRoot, "tests", "lintBaseline.json");
let baseline = { errorCount: 0, warningCount: 0 };
if (fs.existsSync(baselinePath)) {
  try {
    baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
  } catch (err) {
    console.error("Failed to read baseline:", err);
  }
}

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

if (
  counts.errorCount > baseline.errorCount ||
  counts.warningCount > baseline.warningCount
) {
  console.error(
    `Lint count increased. Errors: ${counts.errorCount} (baseline ${baseline.errorCount}), ` +
      `warnings: ${counts.warningCount} (baseline ${baseline.warningCount}).`,
  );
  process.exit(1);
}
console.log(
  `ESLint errors ${counts.errorCount}, warnings ${counts.warningCount} within baseline`,
);
