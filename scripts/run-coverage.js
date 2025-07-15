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
if (extraArgs.includes("--help") || extraArgs.includes("-h")) {
  const jestBin = path.join(
    __dirname,
    "..",
    "backend",
    "node_modules",
    ".bin",
    "jest",
  );
  const result = spawnSync(jestBin, extraArgs, { stdio: "inherit" });
  process.exit(result.status || 0);
}
const jestArgs = [
  "--ci",
  "--coverage",
  "--maxWorkers=2",
  "--detectOpenHandles",
  "--forceExit",
  "--coverageReporters=json-summary",
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
const nycBin = path.join(__dirname, "..", "node_modules", ".bin", "nyc");
const result = spawnSync(nycBin, ["--silent", jestBin, ...jestArgs], {
  encoding: "utf8",
  stdio: "inherit",
  cwd: path.join(__dirname, ".."),
  env: {
    ...process.env,
    NODE_PATH: path.join(__dirname, "..", "node_modules"),
  },
});

const rootDir = path.join(repoRoot, "coverage");
const backendDir = path.join(repoRoot, "backend", "coverage");
fs.mkdirSync(rootDir, { recursive: true });
fs.mkdirSync(backendDir, { recursive: true });
spawnSync(nycBin, ["report", "--reporter=lcov", "--report-dir", rootDir], {
  stdio: "inherit",
  cwd: repoRoot,
});
spawnSync(nycBin, ["report", "--reporter=lcov", "--report-dir", backendDir], {
  stdio: "inherit",
  cwd: repoRoot,
});
const lcovPath = path.join(rootDir, "lcov.info");
if (!fs.existsSync(lcovPath)) {
  console.error(`Missing lcov report: ${lcovPath}`);
  process.exit(1);
}
const lcovData = fs.readFileSync(lcovPath, "utf8");
if (!/TN:/.test(lcovData) || !/SF:/.test(lcovData)) {
  console.error("Invalid lcov report generated");
  process.exit(1);
}
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
