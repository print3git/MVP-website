#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

let dir = "backend/src";
for (const arg of process.argv.slice(2)) {
  if (arg.startsWith("--dir=")) dir = arg.slice(6);
}

dir = path.resolve(process.cwd(), dir);

function walk(d, files = []) {
  for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const full = path.join(d, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (entry.isFile() && /(\.js|\.ts)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

function hasJsDoc(lines, index) {
  for (let i = index - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line === "") continue;
    if (line.startsWith("/**")) return true;
    if (line.startsWith("*") || line.startsWith("*/")) continue;
    return false;
  }
  return false;
}

const missing = [];
for (const file of walk(dir)) {
  const lines = fs.readFileSync(file, "utf8").split(/\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const func = line.match(/export\s+(?:async\s+)?function\s+([a-zA-Z0-9_]+)/);
    if (func && !hasJsDoc(lines, i)) {
      missing.push(`${file}:${i + 1} ${func[1]}`);
    }
    const cls = line.match(/export\s+class\s+([a-zA-Z0-9_]+)/);
    if (cls && !hasJsDoc(lines, i)) {
      missing.push(`${file}:${i + 1} ${cls[1]}`);
    }
  }
}

if (missing.length) {
  console.log("Missing JSDoc comments for:");
  for (const m of missing) console.log("  " + m);
  process.exitCode = 1;
} else {
  console.log("✅ All functions have JSDoc comments.");
}
