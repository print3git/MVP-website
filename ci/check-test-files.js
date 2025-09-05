#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const repoRoot = path.join(__dirname, "..");
const configPath = path.join(__dirname, "expected-test-files.json");

let expected;
try {
  expected = JSON.parse(fs.readFileSync(configPath, "utf8"));
} catch (err) {
  console.error(`Failed to read ${configPath}:`, err);
  process.exit(1);
}

const missing = expected.files.filter(
  (p) => !fs.existsSync(path.join(repoRoot, p)),
);

if (missing.length) {
  console.error(`Missing expected test files:\n${missing.join("\n")}`);
  process.exit(1);
}

console.log("All expected test files exist.");
