#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..", "..");

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      walk(full, out);
    } else if (entry.isFile() && /\.test\.(js|ts)$/.test(entry.name)) {
      out.push(path.relative(repoRoot, full));
    }
  }
  return out;
}

function findTestFiles() {
  const files = [];
  (function search(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "tests" || entry.name === "__tests__") {
          walk(full, files);
        }
        search(full);
      }
    }
  })(repoRoot);
  return files;
}

function parseExecuted(logPath) {
  if (!fs.existsSync(logPath)) {
    console.error(`Missing log file: ${logPath}`);
    process.exit(1);
  }
  const content = fs.readFileSync(logPath, "utf8");
  const executed = new Set();
  const regex = /(PASS|FAIL)\s+([^\n]+?\.test\.(?:js|ts))/g;
  let m;
  while ((m = regex.exec(content))) {
    executed.add(path.normalize(m[2]));
  }
  return executed;
}

function main() {
  const testFiles = findTestFiles();
  const logPath = path.join(repoRoot, "coverage", "failed.log");
  const executed = parseExecuted(logPath);
  const orphans = testFiles.filter((f) => !executed.has(f));
  if (orphans.length) {
    console.log("Orphaned test files:");
    for (const f of orphans) console.log("  " + f);
    process.exit(1);
  } else {
    console.log("No orphaned test files found.");
  }
}

if (require.main === module) main();
