#!/usr/bin/env node
/**
 * Detect orphaned test files that did not run in the last Jest execution.
 * This script can be added to a GitHub Actions job after the test runner for deeper validation.
 */
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..", "..");

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (entry.isFile()) {
      if (/\.(test|spec)\.(js|ts)$/.test(entry.name)) {
        files.push(path.relative(repoRoot, full));
      }
    }
  }
  return files;
}

function findTestDirs(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "tests" || entry.name === "__tests__") {
        results.push(full);
      }
      findTestDirs(full, results);
    }
  }
  return results;
}

function parseExecutedTests(content) {
  const regex = /([^\s'"`]+\.(?:test|spec)\.(?:js|ts))/g;
  const set = new Set();
  let match;
  while ((match = regex.exec(content))) {
    const abs = path.resolve(repoRoot, match[1]);
    set.add(path.relative(repoRoot, abs));
  }
  return set;
}

function loadExecutedTests() {
  const covDir = path.join(repoRoot, "coverage");
  if (!fs.existsSync(covDir)) return new Set();
  const failLog = path.join(covDir, "failed.log");
  if (fs.existsSync(failLog)) {
    return parseExecutedTests(fs.readFileSync(failLog, "utf8"));
  }
  const set = new Set();
  for (const file of fs.readdirSync(covDir)) {
    if (file.endsWith(".json")) {
      try {
        const data = JSON.parse(
          fs.readFileSync(path.join(covDir, file), "utf8"),
        );
        const results =
          data.testResults || (data.results && data.results.testResults);
        if (Array.isArray(results)) {
          for (const r of results) {
            const p = r.testFilePath || r.name;
            if (p) set.add(path.relative(repoRoot, path.resolve(repoRoot, p)));
          }
        }
      } catch {
        // ignore invalid JSON
      }
    }
  }
  return set;
}

function main() {
  const dirs = findTestDirs(repoRoot);
  const all = dirs.flatMap((d) => walk(d));
  const executed = loadExecutedTests();
  const orphans = all.filter((f) => !executed.has(f));
  if (orphans.length) {
    console.log("Orphaned test files:");
    for (const f of orphans) console.log(" -", f);
    process.exit(1);
  } else {
    console.log("No orphaned test files found.");
  }
}

main();
