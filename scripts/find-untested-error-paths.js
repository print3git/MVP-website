#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

function getArg(prefix, fallback) {
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : fallback;
}

const srcDir = getArg("--src=", path.join(__dirname, "..", "backend", "src"));
const testsDir = getArg(
  "--tests=",
  path.join(__dirname, "..", "backend", "tests"),
);

function collectFiles(dir) {
  let res = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      res.push(...collectFiles(full));
    } else if (/\.(js|ts)$/.test(entry.name)) {
      res.push(full);
    }
  }
  return res;
}

const srcFiles = collectFiles(srcDir);
const testFiles = collectFiles(testsDir);

const testContent = testFiles.map((f) => fs.readFileSync(f, "utf8")).join("\n");

const errorRegex = /throw new Error\((`|"|')(.*?)\1\)/gs;
let untested = [];

for (const file of srcFiles) {
  const content = fs.readFileSync(file, "utf8");
  let match;
  while ((match = errorRegex.exec(content))) {
    const msg = match[2];
    if (!testContent.includes(msg)) {
      untested.push(`${file}: ${msg}`);
    }
  }
}

if (untested.length) {
  for (const line of untested) {
    console.log(line);
  }
  process.exit(1);
}
process.exit(0);
