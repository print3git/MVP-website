import { readFileSync, writeFileSync } from "node:fs";
import yaml from "yaml";

const WORKFLOWS = [
  ".github/workflows/ci-full-lane.yml",
  ".github/workflows/codeql.yml",
];

function extractChecks(file: string): string[] {
  const doc = yaml.parse(readFileSync(file, "utf8"));
  const name = doc.name as string;
  const jobs = Object.keys(doc.jobs || {});
  return jobs.map((j) => `${name} / ${j}`);
}

const result = { checks: WORKFLOWS.flatMap(extractChecks) };

if (process.argv.includes("--check")) {
  const current = JSON.parse(
    readFileSync("scripts/ci/expected-checks.json", "utf8"),
  );
  if (JSON.stringify(current) !== JSON.stringify(result)) {
    console.error(
      "scripts/ci/expected-checks.json is out of date. Run `node scripts/ci/update-expected-checks.js` to regenerate.",
    );
    process.exit(1);
  }
} else {
  writeFileSync(
    "scripts/ci/expected-checks.json",
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log("updated expected checks");
}
