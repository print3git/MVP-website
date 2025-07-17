#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (const arg of args) {
    if (arg.startsWith("--src=")) opts.src = arg.slice(6);
    if (arg.startsWith("--tests=")) opts.tests = arg.slice(8);
  }
  if (!opts.src || !opts.tests) {
    console.error(
      "Usage: node scripts/find-untested-error-paths.js --src=dir --tests=dir",
    );
    process.exit(1);
  }
  return opts;
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(full);
    }
  }
  return files;
}

function collectCases(file) {
  const code = fs.readFileSync(file, "utf8");
  const ast = parser.parse(code, {
    sourceType: "unambiguous",
    plugins: ["jsx", "typescript"],
  });
  const lines = code.split(/\n/);
  const cases = [];
  traverse(ast, {
    ThrowStatement(path) {
      const arg = path.node.argument;
      if (
        arg &&
        arg.type === "NewExpression" &&
        arg.callee.type === "Identifier"
      ) {
        const line = path.node.loc.start.line;
        const snippet = lines[line - 1].trim();
        cases.push({
          file,
          line,
          snippet,
          error: arg.callee.name,
        });
      }
    },
    CallExpression(path) {
      const { callee } = path.node;
      if (
        callee.type === "MemberExpression" &&
        (callee.property.name === "send" || callee.property.name === "json") &&
        callee.object.type === "CallExpression"
      ) {
        const inner = callee.object;
        if (
          inner.callee.type === "MemberExpression" &&
          inner.callee.property.name === "status"
        ) {
          const line = path.node.loc.start.line;
          const snippet = lines[line - 1].trim();
          cases.push({ file, line, snippet, status: true });
        }
      }
    },
  });
  return cases;
}

function loadTests(dir) {
  let text = "";
  for (const file of walk(dir)) {
    if (file.endsWith(".test.js") || file.endsWith(".test.ts")) {
      text += fs.readFileSync(file, "utf8");
    }
  }
  return text;
}

function main() {
  const { src, tests } = parseArgs();
  const srcFiles = walk(src);
  const testText = loadTests(tests);
  const untested = [];
  for (const file of srcFiles) {
    for (const c of collectCases(file)) {
      const searchTerm = c.error || c.snippet;
      if (!testText.includes(searchTerm)) {
        untested.push({ file: c.file, line: c.line, snippet: c.snippet });
      }
    }
  }
  console.log(JSON.stringify(untested, null, 2));
  if (untested.length) process.exit(1);
}

if (require.main === module) {
  main();
}
