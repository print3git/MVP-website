#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const catalogPath = path.join(repoRoot, "ci", "catalog.json");
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));

function parseList(value) {
  if (!value) return [];
  try {
    const arr = JSON.parse(value);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return value
      .split(/\r?\n|,/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
}

function match(pathname, pattern) {
  const esc = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    "^" + esc.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*") + "$",
  );
  return re.test(pathname);
}

const changedFiles = parseList(process.env.CHANGED_FILES);
const suitesRan = new Set(parseList(process.env.CI_SUITES));
const artifacts = new Set(parseList(process.env.CI_ARTIFACTS));

let ok = true;
for (const file of changedFiles) {
  const relevant = catalog.suites.filter((s) =>
    (s.paths || []).some((p) => match(file, p)),
  );
  if (relevant.length && !relevant.some((s) => suitesRan.has(s.id))) {
    console.error(`No suite ran for changed file ${file}`);
    ok = false;
  }
}

for (const suite of catalog.suites) {
  if (!suitesRan.has(suite.id)) continue;
  if (suite.junit && !artifacts.has(suite.junit)) {
    console.error(`Suite ${suite.id} missing junit artifact ${suite.junit}`);
    ok = false;
  }
  if (suite.reportDir && !artifacts.has(suite.reportDir)) {
    console.error(
      `Suite ${suite.id} missing reportDir artifact ${suite.reportDir}`,
    );
    ok = false;
  }
}

if (!ok) {
  console.error("CI validation failed");
  process.exit(1);
}
console.log("CI validation passed");
