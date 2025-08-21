#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const distDir = path.join(__dirname, "..", "frontend", "dist");
if (!fs.existsSync(distDir)) {
  console.log("frontend/dist missing; skipping asset link check");
  process.exit(0);
}

const htmlFiles = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (entry.isFile() && p.endsWith(".html")) htmlFiles.push(p);
  }
};
walk(distDir);

const errors = [];
for (const file of htmlFiles) {
  const content = fs.readFileSync(file, "utf8");
  const dir = path.dirname(file);
  const regex = /(?:href|src)="([^"#?]+)"/g;
  let m;
  while ((m = regex.exec(content)) !== null) {
    const link = m[1];
    if (/^(?:https?:|data:|mailto:|#|\/\/)/.test(link)) continue;
    const target = path.resolve(dir, link);
    if (!fs.existsSync(target)) {
      errors.push(`${path.relative(distDir, file)} -> ${link}`);
      continue;
    }
    const stat = fs.lstatSync(target);
    if (stat.isSymbolicLink()) {
      errors.push(`${path.relative(distDir, file)} -> ${link} (symlink)`);
    }
  }
}

if (errors.length) {
  console.error("Cloudflare Pages: unreachable assets detected:");
  for (const e of errors) console.error(` - ${e}`);
  process.exit(1);
}

console.log("asset links OK");
