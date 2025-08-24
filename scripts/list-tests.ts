#!/usr/bin/env node
// @ts-nocheck
const { spawnSync } = require("node:child_process");
const { existsSync, mkdirSync, writeFileSync } = require("node:fs");
const path = require("node:path");

const repoRoot =
  spawnSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf8",
  }).stdout.trim() || process.cwd();

const packages = {
  root: ".",
  frontend: "frontend",
  backend: "backend",
  e2e: "e2e",
};

function run(cmd, args, cwd) {
  try {
    const res = spawnSync(cmd, args, { cwd, encoding: "utf8" });
    if (res.error) throw res.error;
    if (res.status !== 0) throw new Error(res.stderr || res.stdout);
    return res.stdout;
  } catch (err) {
    console.warn(`[warn] ${cmd} failed in ${cwd}:`, err.message);
    return "";
  }
}

function parseOutput(out) {
  if (!out) return [];
  try {
    const data = JSON.parse(out);
    const paths = [];
    const walk = (obj) => {
      if (!obj) return;
      if (typeof obj === "string") {
        if (obj.startsWith("/")) paths.push(obj);
      } else if (Array.isArray(obj)) {
        obj.forEach(walk);
      } else if (typeof obj === "object") {
        Object.values(obj).forEach(walk);
      }
    };
    walk(data);
    return paths;
  } catch {
    return out
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(
        (l) => l && (l.startsWith("/") || l.match(/\.([cm]?js|tsx?|jsx?)$/)),
      );
  }
}

const results = {};
const globalSet = new Set();

for (const [name, relDir] of Object.entries(packages)) {
  const cwd = path.join(repoRoot, relDir);
  const files = new Set();

  // determine if package has package.json or config
  const hasPkg =
    existsSync(path.join(cwd, "package.json")) ||
    existsSync(path.join(cwd, "jest.config.js")) ||
    existsSync(path.join(cwd, "vitest.config.ts")) ||
    existsSync(path.join(cwd, "playwright.config.js")) ||
    existsSync(path.join(cwd, "playwright.config.ts"));
  if (!hasPkg) {
    console.warn(`[warn] skipping ${name}: no config or package.json`);
    continue;
  }

  // Jest
  let out = run("npx", ["--no-install", "jest", "--listTests", "--json"], cwd);
  parseOutput(out).forEach((p) => files.add(p));

  // Vitest
  out = run("npx", ["--no-install", "vitest", "list", "--reporter=json"], cwd);
  if (!out) {
    out = run("npx", ["--no-install", "vitest", "--list"], cwd);
  }
  parseOutput(out).forEach((p) => files.add(p));

  // Playwright
  const pwArgs = [
    "--no-install",
    "playwright",
    "test",
    "--list",
    "--reporter=json",
  ];
  if (
    name === "e2e" &&
    !existsSync(path.join(cwd, "playwright.config.ts")) &&
    !existsSync(path.join(cwd, "playwright.config.js"))
  ) {
    pwArgs.push(
      "--config",
      path.relative(cwd, path.join(repoRoot, "playwright.config.js")),
    );
  }
  out = run("npx", pwArgs, cwd);
  if (!out) {
    const fallback = ["--no-install", "playwright", "test", "--list"];
    if (
      name === "e2e" &&
      !existsSync(path.join(cwd, "playwright.config.ts")) &&
      !existsSync(path.join(cwd, "playwright.config.js"))
    ) {
      fallback.push(
        "--config",
        path.relative(cwd, path.join(repoRoot, "playwright.config.js")),
      );
    }
    out = run("npx", fallback, cwd);
  }
  parseOutput(out).forEach((p) => files.add(p));

  const relFiles = Array.from(files)
    .map((f) => path.relative(repoRoot, path.resolve(cwd, f)))
    .sort();
  relFiles.forEach((f) => globalSet.add(f));
  results[name] = { count: relFiles.length, files: relFiles };
}

const output = {
  generatedAt: new Date().toISOString(),
  commit: spawnSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).stdout.trim(),
  packages: results,
  totals: { count: globalSet.size },
};

const outDir = path.join(repoRoot, "test-inventory");
mkdirSync(outDir, { recursive: true });
writeFileSync(
  path.join(outDir, "current.json"),
  JSON.stringify(output, null, 2),
);
console.log(
  `Wrote ${globalSet.size} test files to test-inventory/current.json`,
);
