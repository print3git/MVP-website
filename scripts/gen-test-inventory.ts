#!/usr/bin/env tsx
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const repoRoot =
  spawnSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf8",
  }).stdout.trim() || process.cwd();

const packages: Record<string, string> = {
  root: ".",
  frontend: "frontend",
  backend: "backend",
  e2e: "e2e",
};

function listTests(dir: string): string[] {
  const res = spawnSync("git", ["ls-files"], { cwd: dir, encoding: "utf8" });
  if (res.error) throw res.error;
  return res.stdout
    .split(/\r?\n/)
    .filter((f) => /(\.(test|spec)\.[jt]sx?$|__tests__\/.*)/.test(f));
}

const allFiles = new Set<string>();
const out: Record<string, { count: number; files: string[] }> = {};
for (const [name, rel] of Object.entries(packages)) {
  const cwd = path.join(repoRoot, rel);
  let files = listTests(cwd).map((f) => path.join(rel, f).replace(/^\.\//, ""));
  if (name === "root") {
    files = files.filter(
      (f) =>
        !f.startsWith("frontend/") &&
        !f.startsWith("backend/") &&
        !f.startsWith("e2e/"),
    );
  }
  files.sort();
  files.forEach((f) => allFiles.add(f));
  out[name] = { count: files.length, files };
}

const output = { totals: { count: allFiles.size }, packages: out };
const outDir = path.join(repoRoot, "test-inventory");
mkdirSync(outDir, { recursive: true });
writeFileSync(
  path.join(outDir, "current.json"),
  JSON.stringify(output, null, 2),
);
console.log(`Wrote ${allFiles.size} test files to test-inventory/current.json`);
