#!/usr/bin/env node
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const baselinePath = path.join(repoRoot, "tests", "processEnvBaseline.json");

let baseline = 0;
if (fs.existsSync(baselinePath)) {
  try {
    baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8")).count;
  } catch (err) {
    console.error("Failed to read baseline:", err);
  }
}

const grepCmd = [
  'grep -R "process\\.env" -n',
  "--exclude-dir=node_modules",
  "--exclude-dir=.git",
  "--exclude='*processEnvCount.test.js'",
  "--exclude='check-process-env.js'",
  "--exclude='processEnvBaseline.json'",
  "| wc -l",
].join(" ");

const count = Number(
  execSync(grepCmd, { cwd: repoRoot, encoding: "utf8" }).trim(),
);

if (count > baseline) {
  console.error(
    `Error: found ${count} process.env references, baseline is ${baseline}.`,
  );
  process.exit(1);
}
console.log(
  `process.env reference count ${count} within baseline ${baseline}.`,
);
