#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const repoRoot = path.resolve(__dirname, "..");
const logPath = path.join(repoRoot, "coverage", "failed.log");

if (!fs.existsSync(logPath)) {
  console.error(`Missing failed log: ${logPath}`);
  process.exit(1);
}

const raw = fs.readFileSync(logPath, "utf8");
const lines = raw.split(/\r?\n/);

function categorize(msg) {
  if (/toEqual/.test(msg)) return "toEqual failed";
  if (/TypeError/.test(msg)) return "TypeError";
  if (/timed?out|timeout/i.test(msg)) return "timeout";
  const m = msg.match(/([A-Za-z]*Error)/);
  return m ? m[1] : "unknown";
}

const summary = new Map();
let currentFile = null;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const failMatch = /^FAIL\s+([^\s]+)/.exec(line);
  if (failMatch) {
    currentFile = path.relative(repoRoot, failMatch[1]);
    continue;
  }
  const bulletMatch = /^\s*●\s+(.*)/.exec(line);
  if (bulletMatch) {
    const full = bulletMatch[1];
    const suite = full.split("›")[0].trim();
    let j = i + 1;
    let message = "";
    while (j < lines.length) {
      const l = lines[j];
      if (/^\s*●/.test(l) || /^FAIL\s/.test(l) || /^PASS\s/.test(l)) break;
      if (/^\s*$/.test(l)) break;
      if (/^\s*at /.test(l)) break;
      message += l + " ";
      j++;
    }
    const type = categorize(message.trim());
    if (!summary.has(suite)) summary.set(suite, new Map());
    const byFile = summary.get(suite);
    if (!byFile.has(currentFile)) byFile.set(currentFile, new Map());
    const byError = byFile.get(currentFile);
    byError.set(type, (byError.get(type) || 0) + 1);
  }
}

let repoUrl = null;
try {
  repoUrl = execSync("git config --get remote.origin.url", {
    encoding: "utf8",
  }).trim();
  if (repoUrl.startsWith("git@github.com:")) {
    repoUrl = repoUrl.replace("git@github.com:", "https://github.com/");
  }
  repoUrl = repoUrl.replace(/\.git$/, "");
} catch {
  repoUrl = null;
}

function link(file) {
  if (!repoUrl) return file;
  return `${repoUrl}/blob/main/${file}`;
}

function format(summary) {
  let out = "# Test Failure Summary\n\n";
  for (const [suite, byFile] of summary) {
    out += `## ${suite}\n`;
    for (const [file, byError] of byFile) {
      const href = link(file);
      out += `- **${href}**\n`;
      for (const [type, count] of byError) {
        out += `  - ${type}: ${count}\n`;
      }
    }
    out += "\n";
  }
  return out;
}

const output = format(summary);
console.log(output);

if (process.argv.includes("--markdown")) {
  const mdPath = path.join(repoRoot, "test-failure-summary.md");
  fs.writeFileSync(mdPath, output);
  console.log(`Summary written to ${mdPath}`);
}
