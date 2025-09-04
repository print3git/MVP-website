#!/usr/bin/env node
const { spawnSync } = require("child_process");
const path = require("path");

const eslintBin = path.resolve(__dirname, "../node_modules/.bin/eslint");
const args = process.argv.slice(2);
const result = spawnSync(eslintBin, ["--error-on-unmatched-pattern", ...args], {
  encoding: "utf-8",
  stdio: ["inherit", "inherit", "pipe"],
});

if (result.status !== 0) {
  const stderr = result.stderr || "";
  if (/No files matching/.test(stderr)) {
    console.error(
      "No files matched for ESLint; failing to prevent silent skips.",
    );
    process.exit(1);
  }
  process.stderr.write(stderr);
  process.exit(result.status);
}
