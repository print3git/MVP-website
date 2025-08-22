#!/usr/bin/env node
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const script = path.join(repoRoot, "scripts", "ci", "map-workflows.js");
const output = path.join(repoRoot, "ci-workflow-map.json");

const result = spawnSync("node", [script], { cwd: repoRoot, encoding: "utf8" });
if (result.status !== 0) {
  process.stderr.write(result.stderr);
  process.exit(result.status ?? 1);
}
fs.writeFileSync(output, result.stdout);
