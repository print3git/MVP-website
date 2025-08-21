import { readFile } from "node:fs/promises";
import process from "node:process";

async function main() {
  const pkg = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url)),
  );
  const thresholds = pkg.coverageThreshold || {};
  const lcov = await readFile(
    new URL("../coverage/lcov.info", import.meta.url),
    "utf8",
  );

  const totals = {
    lines: { found: 0, hit: 0 },
    functions: { found: 0, hit: 0 },
    branches: { found: 0, hit: 0 },
  };

  for (const record of lcov.split("end_of_record")) {
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

  const percentages = {
    lines: totals.lines.found
      ? (totals.lines.hit / totals.lines.found) * 100
      : 100,
    functions: totals.functions.found
      ? (totals.functions.hit / totals.functions.found) * 100
      : 100,
    branches: totals.branches.found
      ? (totals.branches.hit / totals.branches.found) * 100
      : 100,
    statements: 0, // will mirror lines
  };
  percentages.statements = percentages.lines;

  const failures = [];
  for (const [metric, threshold] of Object.entries(thresholds)) {
    const actual = percentages[metric];
    if (actual !== undefined && actual < threshold) {
      failures.push(`${metric}: ${actual.toFixed(2)}% < ${threshold}%`);
    }
  }

  if (failures.length) {
    console.error("Coverage below threshold:\n" + failures.join("\n"));
    process.exit(1);
  } else {
    console.log("Coverage meets configured thresholds");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
