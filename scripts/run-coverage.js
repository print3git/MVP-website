#!/usr/bin/env node
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");

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
  "--coverageReporters=text-lcov",
  "--coverageReporters=json-summary",
  "--coverageReporters=lcov",
  "--coverageThreshold={}",
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
  stdio: ["inherit", "pipe", "pipe"],
  cwd: path.join(__dirname, ".."),
  env: {
    ...process.env,
    NODE_PATH: path.join(__dirname, "..", "node_modules"),
  },
});

const lcovPath = path.join(repoRoot, "coverage", "lcov.info");
fs.mkdirSync(path.dirname(lcovPath), { recursive: true });
let output = (result.stdout || "") + (result.stderr || "");
const start = output.indexOf("TN:");
if (start === -1) {
  console.error("Failed to parse LCOV from jest output");
  process.exit(result.status || 1);
}
output = output.slice(start);
fs.writeFileSync(lcovPath, output);

const backendLcov = path.join(repoRoot, "backend", "coverage", "lcov.info");
fs.mkdirSync(path.dirname(backendLcov), { recursive: true });
fs.writeFileSync(backendLcov, output);
console.log(`LCOV written to ${lcovPath}`);
// Copy coverage summary produced by Jest to the repo root for CI checks.
const backendSummary = path.join(
  repoRoot,
  "backend",
  "coverage",
  "coverage-summary.json",
);
if (!fs.existsSync(backendSummary)) {
  console.error(`Missing coverage summary: ${backendSummary}`);
  process.exit(1);
}
const summaryPath = path.join(repoRoot, "coverage", "coverage-summary.json");
fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
const summaryData = fs.readFileSync(backendSummary);
fs.writeFileSync(summaryPath, summaryData);
if (result.status) {
  const combined = (result.stdout || "") + (result.stderr || "");
  if (combined) {
    const lines = combined.trim().split("\n");
    const snippet = lines.slice(-50).join("\n");
    console.error("\n\u26d4 Jest output (last 50 lines):\n");
    console.error(snippet);
    try {
      const failLog = path.join(repoRoot, "coverage", "failed.log");
      fs.mkdirSync(path.dirname(failLog), { recursive: true });
      fs.writeFileSync(failLog, combined);
      console.error(`Full output written to ${failLog}`);
    } catch {
      // ignore errors writing the log
    }
  }
  console.error(`Jest exited with code ${result.status}`);
  process.exit(result.status);
}
const validContent = fs.readFileSync(lcovPath, "utf8");
if (/^(TN|SF):/m.test(validContent)) {
  console.log("\u2705 lcov.info written successfully");
} else {
  console.error("Generated lcov.info is invalid");
  process.exit(1);
}
