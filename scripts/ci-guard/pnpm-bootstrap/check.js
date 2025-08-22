#!/usr/bin/env node
const fs = require("fs");

const start = "# >>> BEGIN MANAGED BLOCK: ci-guard:pnpm-bootstrap";
const end = "# <<< END MANAGED BLOCK: ci-guard:pnpm-bootstrap";

function hasBlock(content) {
  return content.includes(start) && content.includes(end);
}

function checkFiles(files) {
  const missing = files.filter((f) => {
    const text = fs.readFileSync(f, "utf8");
    return !hasBlock(text);
  });
  if (missing.length > 0) {
    throw new Error(`Missing pnpm bootstrap block in: ${missing.join(", ")}`);
  }
}

if (require.main === module) {
  try {
    const files = process.argv.slice(2);
    checkFiles(files);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

module.exports = { hasBlock, checkFiles };
