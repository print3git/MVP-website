#!/usr/bin/env node
// @ts-nocheck
import fs from 'fs';
import path from 'path';

const repoRoot = path.resolve(__dirname, '..');
const argDir = process.argv[2];
const outputDir = argDir
  ? path.resolve(repoRoot, argDir)
  : fs.existsSync(path.join(repoRoot, 'dist'))
    ? path.join(repoRoot, 'dist')
    : fs.existsSync(path.join(repoRoot, 'out'))
      ? path.join(repoRoot, 'out')
      : repoRoot;

const issues: string[] = [];

function walk(dir: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      checkSymlink(full);
    }
    if (entry.isDirectory()) {
      walk(full);
    }
  }
}

function checkSymlink(file: string) {
  let target: string;
  try {
    target = fs.readlinkSync(file);
  } catch {
    issues.push(`unreadable symlink: ${file}`);
    return;
  }
  const resolved = path.resolve(path.dirname(file), target);
  try {
    fs.accessSync(resolved, fs.constants.R_OK);
  } catch {
    issues.push(`symlink target inaccessible: ${file} -> ${target}`);
    return;
  }
  if (!resolved.startsWith(outputDir)) {
    issues.push(`symlink escapes output directory: ${file} -> ${target}`);
  }
}

walk(outputDir);

if (issues.length) {
  console.error('Cloudflare symlink check failed:');
  for (const msg of issues) console.error(' -', msg);
  process.exit(1);
}

console.log('Cloudflare symlink check passed.');
