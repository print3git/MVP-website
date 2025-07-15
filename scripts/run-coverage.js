#!/usr/bin/env node
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const repoRoot = path.join(__dirname, "..");

// Ensure the active Node version matches the project's requirement so the
// coverage run doesn't silently use a wrong version when mise wasn't activated.
require("./check-node-version.js");

// Validate environment variables and dependencies just like the test and CI
// scripts do. This prevents confusing failures when `npm run coverage` is run
// without first executing the setup script.
require("./assert-setup.js");

const extraArgs = process.argv.slice(2);
const jestArgs = [
  "--ci",
  "--coverage",
  "--maxWorkers=2",
  "--detectOpenHandles",
  "--forceExit",
  "--coverageReporters=text-lcov",
  "--coverageReporters=json-summary",
  "--coverageReporters=lcov",
  "--coverageThreshold={}",
  "--silent",
  "--config",
  path.join(__dirname, "..", "backend", "jest.config.js"),
  ...(extraArgs.length ? ["--runTestsByPath", ...extraArgs] : []),
];

const jestBin = path.join(
  __dirname,
  "..",
  "backend",
  "node_modules",
  ".bin",
  "jest",
);
const result = spawnSync(jestBin, jestArgs, {
  encoding: "utf8",
  stdio: ["inherit", "pipe", "inherit"],
  cwd: path.join(__dirname, ".."),
  env: {
    ...process.env,
    NODE_PATH: path.join(__dirname, "..", "node_modules"),
  },
});

const lcovPath = path.join(repoRoot, "coverage", "lcov.info");
fs.mkdirSync(path.dirname(lcovPath), { recursive: true });
let output = result.stdout || "";
const start = output.indexOf("TN:");
if (start === -1) {
  console.error("Failed to parse LCOV from jest output");
  process.exit(result.status || 1);
}
output = output.slice(start);
fs.writeFileSync(lcovPath, output);
console.log(`LCOV written to ${lcovPath}`);
const summaryPath = path.join(
  repoRoot,
  "backend",
  "coverage",
  "coverage-summary.json",
);
if (!fs.existsSync(summaryPath)) {
  console.error(`Missing coverage summary: ${summaryPath}`);
  process.exit(1);
}
if (result.status) {
  console.error(`Jest exited with code ${result.status}`);
  process.exit(result.status);
}
