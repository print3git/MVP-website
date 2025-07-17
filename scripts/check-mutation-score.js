const fs = require("fs");
const path = require("path");

const DEFAULT_REPORT = path.join("reports", "mutation", "mutation.json");
const DEFAULT_THRESHOLD = 80;

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { report: DEFAULT_REPORT };
  for (const arg of args) {
    const match = arg.match(/^--report=(.+)$/);
    if (match) {
      result.report = match[1];
    }
  }
  return result;
}

function main() {
  const { report } = parseArgs();
  let data;
  try {
    const json = fs.readFileSync(report, "utf8");
    data = JSON.parse(json);
  } catch (err) {
    console.error(`Failed to read report at ${report}:`, err.message);
    process.exit(1);
  }

  const score = data?.metrics?.mutationScore;
  if (typeof score !== "number") {
    console.error("Invalid mutation score in report");
    process.exit(1);
  }

  if (score < DEFAULT_THRESHOLD) {
    console.log(
      `Mutation score ${score}% is below threshold ${DEFAULT_THRESHOLD}%`,
    );
    process.exit(1);
  }

  process.exit(0);
}

if (require.main === module) {
  main();
}
