#!/usr/bin/env node
const fs = require("fs");
const { execSync } = require("child_process");
const path = require("path");

function runJest(args) {
  const jestBin = path.join(
    __dirname,
    "..",
    "backend",
    "node_modules",
    ".bin",
    "jest",
  );
  const cmdArgs = args.join(" ");
  if (fs.existsSync(jestBin)) {
    execSync(`${jestBin} ${cmdArgs}`, { stdio: "inherit" });
  } else {
    execSync(`npm test --prefix backend -- ${cmdArgs}`, { stdio: "inherit" });
  }
}

if (require.main === module) {
  runJest(process.argv.slice(2));
}

module.exports = runJest;
