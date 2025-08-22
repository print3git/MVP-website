#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..", "..");
const result = {
  files: [],
  byArea: { backend: [], frontend: [], e2e: [], docs: [] },
};

function isTestFile(rel) {
  return (
    /\.(test|spec)\.(js|jsx|ts|tsx)$/.test(rel) ||
    rel.includes("__tests__/") ||
    /^backend\/.*\/tests\//.test(rel) ||
    /^frontend\/.*\/tests\//.test(rel) ||
    rel.startsWith("e2e/")
  );
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else {
      const rel = path.relative(repoRoot, full).replace(/\\/g, "/");
      if (isTestFile(rel)) {
        result.files.push(rel);
        if (rel.startsWith("backend/")) result.byArea.backend.push(rel);
        else if (rel.startsWith("frontend/")) result.byArea.frontend.push(rel);
        else if (rel.startsWith("e2e/")) result.byArea.e2e.push(rel);
        else if (rel.startsWith("docs/")) result.byArea.docs.push(rel);
      }
    }
  }
}

walk(repoRoot);
result.files.sort();
for (const key of Object.keys(result.byArea)) result.byArea[key].sort();
console.log(JSON.stringify(result, null, 2));
