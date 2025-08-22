import { existsSync } from "fs";
import { resolve } from "path";

const root = resolve(__dirname, "..", "..");
const required = [
  ".github/workflows/ci-canary.yml",
  ".github/workflows/ci-burst-probe.yml",
  ".github/workflows/ci-aws-sanity.yml",
  ".github/workflows/ci-runner-labels.yml",
];

const missing = required.filter((rel) => !existsSync(resolve(root, rel)));

if (missing.length) {
  console.error("Missing required CI workflow files:\n" + missing.join("\n"));
  process.exit(1);
}

console.log("All required CI workflow files are present.");
