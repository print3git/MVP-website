#!/usr/bin/env node
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const jestArgs = [
  "--ci",
  "--coverage",
  "--maxWorkers=2",
  "--detectOpenHandles",
  "--forceExit",
  "--coverageReporters=text-lcov",
  "--silent",
  "--runTestsByPath",
  ...process.argv.slice(2),
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

const lcovPath = path.join("coverage", "lcov.info");
fs.mkdirSync(path.dirname(lcovPath), { recursive: true });
let output = result.stdout || "";
const start = output.indexOf("TN:");
if (start !== -1) output = output.slice(start);
fs.writeFileSync(lcovPath, output);
console.log(`LCOV written to ${lcovPath}`);
if (result.status) {
  console.error(`Jest exited with code ${result.status}`);
}
