#!/usr/bin/env node
const { execSync } = require("child_process");
const path = require("path");

function isNewFile(file) {
  try {
    execSync(`git cat-file -e HEAD:${file}`, { stdio: "ignore" });
    return false;
  } catch {
    return true;
  }
}

const validPattern = /\.(?:test|spec)\.[a-zA-Z0-9]{16,20}\.[cm]?(?:js|ts)x?$/;
let failed = false;

for (const file of process.argv.slice(2)) {
  if (!isNewFile(file)) continue;
  const base = path.basename(file);
  if (!validPattern.test(base)) {
    console.error(
      `❌ ${file} is missing required 16–20 character random suffix before the extension.`,
    );
    failed = true;
  }
}

if (failed) {
  console.error(
    "Rename test files to include a unique random 16–20 character alphanumeric suffix before the extension, e.g. audit.test.h3298mx894uz3m03mx1.ts",
  );
  process.exit(1);
}
