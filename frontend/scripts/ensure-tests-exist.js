#!/usr/bin/env node
const { execSync } = require("child_process");

try {
  const output = execSync("npx jest --listTests", { encoding: "utf-8" }).trim();
  const count = output ? output.split("\n").filter(Boolean).length : 0;
  if (count < 1) {
    console.error("No tests discovered; failing to prevent silent skips.");
    process.exit(1);
  }
} catch (err) {
  console.error("Failed to list tests; ensure Jest is installed.");
  process.exit(1);
}
