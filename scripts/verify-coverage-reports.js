#!/usr/bin/env node
const fs = require("fs");

const paths = process.argv.slice(2);
if (paths.length === 0) {
  console.error("Usage: verify-coverage-reports <file...>");
  process.exit(1);
}
const missing = paths.filter((p) => !fs.existsSync(p));
if (missing.length) {
  console.error(`Missing coverage reports:\n${missing.join("\n")}`);
  process.exit(1);
}
console.log("All coverage reports produced.");
