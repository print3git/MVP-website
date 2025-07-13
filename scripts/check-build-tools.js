#!/usr/bin/env node
const { spawnSync } = require("child_process");

const packages = ["build-essential", "python3"];
const missing = [];

for (const pkg of packages) {
  const res = spawnSync("dpkg", ["-s", pkg]);
  if (res.status !== 0) missing.push(pkg);
}

if (missing.length) {
  console.error(`Missing build tools: ${missing.join(", ")}`);
  process.exit(1);
}
console.log("✅ build tools OK");
