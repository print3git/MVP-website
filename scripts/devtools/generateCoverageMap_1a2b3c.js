#!/usr/bin/env node
import { promises as fs } from "fs";
import path from "path";

async function getTestFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await getTestFiles(full)));
    } else if (/\.(test|spec)\.(js|ts|jsx|tsx)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

function extractImports(content) {
  const regex =
    /(?:import\s+[^'";]+from\s+|import\s+|require\()\s*["']([^"']+)["']/g;
  const imports = [];
  let m;
  while ((m = regex.exec(content))) {
    imports.push(m[1]);
  }
  return imports;
}

async function analyzeFile(file) {
  const content = await fs.readFile(file, "utf8");
  const imports = extractImports(content);
  const related = new Set();
  for (const imp of imports) {
    if (!imp.startsWith(".") && !imp.startsWith("..")) continue;
    const resolved = path.resolve(path.dirname(file), imp);
    if (!resolved.includes(path.join("backend", ""))) continue;
    const jsPath =
      resolved.endsWith(".js") || resolved.endsWith(".ts")
        ? resolved
        : resolved + ".js";
    if (
      await fs
        .access(jsPath)
        .then(() => true)
        .catch(() => false)
    ) {
      related.add(path.relative(process.cwd(), jsPath));
    }
  }
  return Array.from(related);
}

async function main() {
  const testDirs = ["tests", "backend/tests"];
  const testFiles = [];
  for (const dir of testDirs) {
    try {
      testFiles.push(...(await getTestFiles(dir)));
    } catch {
      // ignore missing directories
    }
  }
  const map = {};
  for (const file of testFiles) {
    map[path.basename(file)] = await analyzeFile(file);
  }
  console.log(JSON.stringify(map, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
