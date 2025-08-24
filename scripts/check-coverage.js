const fs = require("fs");

const config = JSON.parse(fs.readFileSync(".nycrc", "utf8"));

const summaryPath = "coverage/coverage-summary.json";
if (!fs.existsSync(summaryPath)) {
  console.error(
    `Missing coverage summary: ${summaryPath}\nRun 'npm run coverage' first to generate it.`,
  );
  process.exit(1);
}
const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));

const metrics = ["branches", "functions", "lines", "statements"];
const baselinePath = "tests/coverageBaseline.json";
let failed = false;
for (const m of metrics) {
  const actual = summary.total[m].pct;
  const threshold = config[m];
  console.log(`${m}: ${actual}%`);
  if (typeof threshold === "number" && actual < threshold) {
    console.error(
      `Coverage for ${m} ${actual}% does not meet threshold ${threshold}%`,
    );
    failed = true;
  }
}
if (failed) {
  if (!fs.existsSync(baselinePath)) {
    fs.writeFileSync(baselinePath, JSON.stringify(summary.total, null, 2));
    console.warn(
      `\u26A0\uFE0F coverage below threshold. Baseline written to ${baselinePath}`,
    );
    process.exit(0);
  }
  process.exit(1);
}
console.log("Coverage thresholds met.");
