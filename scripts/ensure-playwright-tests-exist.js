#!/usr/bin/env node
const { execSync } = require("child_process");

try {
  const output = execSync("npx playwright list-files", {
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "inherit"],
  }).trim();
  const count = output ? output.split("\n").filter(Boolean).length : 0;
  if (count < 1) {
    console.error("No tests discovered; failing to prevent silent skips.");
    process.exit(1);
  }
} catch (err) {
  console.error("Failed to list Playwright tests.");
  process.exit(1);
}
