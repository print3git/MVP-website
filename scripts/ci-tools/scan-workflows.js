#!/usr/bin/env node
// scan-workflows.js - replicate rg queries in Node without external deps
const fs = require("fs");
const path = require("path");

function walk(dir, fileList = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const res = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(res, fileList);
    else fileList.push(res);
  }
  return fileList;
}

function getWorkflowFiles(cwd) {
  const dir = path.join(cwd, ".github", "workflows");
  if (!fs.existsSync(dir)) return [];
  return walk(dir).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));
}

function readLines(file) {
  return fs.readFileSync(file, "utf8").split(/\r?\n/);
}

function findIdToken(cwd) {
  const files = getWorkflowFiles(cwd);
  return files
    .filter((f) => /id-token/i.test(fs.readFileSync(f, "utf8")))
    .map((f) => path.relative(cwd, f));
}

function findSelfHostedLabels(cwd) {
  const files = getWorkflowFiles(cwd);
  const results = [];
  for (const f of files) {
    const lines = readLines(f);
    lines.forEach((line, idx) => {
      if (/runs-on:.*self-hosted/.test(line)) {
        results.push(`${path.relative(cwd, f)}:${idx + 1}:${line.trim()}`);
      }
    });
  }
  return results;
}

function findUbuntuLatest(cwd) {
  const files = getWorkflowFiles(cwd);
  const results = [];
  for (const f of files) {
    const content = fs.readFileSync(f, "utf8");
    if (/runs-on:\s*ubuntu-latest/.test(content)) {
      results.push(path.relative(cwd, f));
    }
  }
  return results;
}

function findText(cwd, pattern) {
  const regex = new RegExp(pattern, "i");
  const files = walk(cwd);
  const matched = new Set();
  for (const f of files) {
    try {
      const content = fs.readFileSync(f, "utf8");
      if (regex.test(content)) matched.add(path.relative(cwd, f));
    } catch {
      /* ignore binary */
    }
  }
  return Array.from(matched).sort();
}

function listSecretsRefs(cwd) {
  const files = getWorkflowFiles(cwd);
  const regex = /secrets\.[A-Z0-9_\-]+/g;
  const set = new Set();
  for (const f of files) {
    const content = fs.readFileSync(f, "utf8");
    let m;
    while ((m = regex.exec(content)) !== null) set.add(m[0]);
  }
  return Array.from(set).sort();
}

function findHardcodedAwsKeys(cwd) {
  const regex = /AKIA[0-9A-Z]{16}/g;
  const files = walk(cwd);
  const results = [];
  for (const f of files) {
    let lines;
    try {
      lines = readLines(f);
    } catch {
      continue;
    }
    lines.forEach((line, idx) => {
      if (regex.test(line))
        results.push(`${path.relative(cwd, f)}:${idx + 1}:${line.trim()}`);
    });
  }
  return results;
}

function findPostDeployRefs(cwd) {
  const files = getWorkflowFiles(cwd);
  const regex = /post-deploy/i;
  return files
    .filter((f) => regex.test(fs.readFileSync(f, "utf8")))
    .map((f) => path.relative(cwd, f));
}

function main() {
  const args = process.argv.slice(2);
  const cwd = process.cwd();
  const flag = args[0];
  let result = [];
  switch (flag) {
    case "--id-token":
      result = findIdToken(cwd);
      break;
    case "--self-hosted":
      result = findSelfHostedLabels(cwd);
      break;
    case "--ubuntu-latest":
      result = findUbuntuLatest(cwd);
      break;
    case "--grep":
      if (!args[1]) {
        console.error("missing pattern");
        process.exit(1);
      }
      result = findText(cwd, args[1]);
      break;
    case "--secrets":
      result = listSecretsRefs(cwd);
      break;
    case "--awskeys":
      result = findHardcodedAwsKeys(cwd);
      break;
    case "--postdeploy":
      result = findPostDeployRefs(cwd);
      break;
    default:
      console.error(
        "usage: node scan-workflows.js [--id-token|--self-hosted|--ubuntu-latest|--grep PATTERN|--secrets|--awskeys|--postdeploy]",
      );
      process.exit(1);
  }
  console.log(JSON.stringify(result));
}

main();
