const fs = require("fs");

const config = JSON.parse(fs.readFileSync(".nycrc", "utf8"));
const summaryPath = "backend/coverage/coverage-summary.json";
if (!fs.existsSync(summaryPath)) {
  console.error(
    `Coverage summary not found at ${summaryPath}. Run "npm run coverage" first.`,
  );
  process.exit(1);
}
const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));

const metrics = ["branches", "functions", "lines", "statements"];
let failed = false;
for (const m of metrics) {
  const actual = summary.total[m].pct;
  const threshold = config[m];
  if (typeof threshold === "number" && actual < threshold) {
    console.error(
      `Coverage for ${m} ${actual}% does not meet threshold ${threshold}%`,
    );
    failed = true;
  }
}
if (failed) process.exit(1);
console.log("Coverage thresholds met.");
