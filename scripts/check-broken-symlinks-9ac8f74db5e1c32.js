#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const argDir = process.argv[2];
const outputDir = argDir
  ? path.resolve(repoRoot, argDir)
  : fs.existsSync(path.join(repoRoot, "dist"))
    ? path.join(repoRoot, "dist")
    : repoRoot;

const ignorePaths = [path.join(repoRoot, "tests", "path-no-mise")];

const badPaths = [];

function walk(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    const e = err;
    badPaths.push(`${dir} (${e.code || e.message})`);
    return;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (ignorePaths.some((p) => full.startsWith(p))) {
      continue;
    }
    try {
      const lst = fs.lstatSync(full);
      if (lst.isSymbolicLink()) {
        try {
          const target = fs.readlinkSync(full);
          fs.statSync(path.resolve(path.dirname(full), target));
        } catch {
          badPaths.push(`broken symlink: ${full}`);
          continue;
        }
      }
      if (lst.isDirectory()) {
        walk(full);
      } else {
        fs.accessSync(full, fs.constants.R_OK);
      }
    } catch (err) {
      const e = err;
      badPaths.push(`${full} (${e.code || e.message})`);
    }
  }
}

walk(outputDir);

if (badPaths.length) {
  console.error("Build output verification failed. Issues found:");
  for (const p of badPaths) console.error(" -", p);
  process.exit(1);
}

console.log("No broken symlinks or permission issues detected.");
