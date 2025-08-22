#!/usr/bin/env ts-node
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const PACKAGE_ROOTS = ["backend", "frontend", "docs", "infra", "e2e"];
const IGNORE_DIRS = [
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".next",
  ".cache",
  ".turbo",
];

function listTrackedFiles(): string[] {
  return execSync("git ls-files", { encoding: "utf8" })
    .trim()
    .split("\n")
    .filter(Boolean);
}

function isIgnored(file: string): boolean {
  return IGNORE_DIRS.some((dir) => file.split("/").includes(dir));
}

function isTest(file: string): boolean {
  if (isIgnored(file)) return false;
  return (
    /(^|\/)__tests__\/.*\.(js|jsx|ts|tsx)$/.test(file) ||
    /\.(test|spec)\.(js|jsx|ts|tsx)$/.test(file) ||
    /^playwright\/.*\/tests\/.*\.(ts|js)$/.test(file) ||
    /^e2e\/.*\.(ts|js)$/.test(file)
  );
}

function getPackageRoot(file: string): string {
  for (const root of PACKAGE_ROOTS) {
    if (file.startsWith(root + "/")) return root;
  }
  return "root";
}

function hashFile(file: string): string {
  const data = fs.readFileSync(file);
  return crypto.createHash("sha1").update(data).digest("hex");
}

function collectCurrent() {
  const packages: Record<string, { current: any[]; historical: any[] }> = {};
  const currentTests: string[] = [];

  for (const root of [
    "root",
    ...PACKAGE_ROOTS.filter((r) => fs.existsSync(r)),
  ]) {
    packages[root] = { current: [], historical: [] };
  }

  for (const file of listTrackedFiles()) {
    if (!isTest(file)) continue;
    currentTests.push(file);
    const pkg = getPackageRoot(file);
    const stat = fs.statSync(file);
    packages[pkg].current.push({
      path: file,
      hash: hashFile(file),
      size: stat.size,
    });
  }

  return { packages, currentTests };
}

function collectHistorical() {
  const since = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
  const commits = execSync(
    `git rev-list --since=${since} --max-count=1000 --reverse HEAD`,
    { encoding: "utf8" },
  )
    .trim()
    .split("\n")
    .filter(Boolean);
  const hist = new Map<string, { firstSeenSha: string; lastSeenSha: string }>();
  for (const sha of commits) {
    const output = execSync(`git show --pretty="" --name-only ${sha}`, {
      encoding: "utf8",
    }).trim();
    if (!output) continue;
    for (const file of output.split("\n")) {
      if (!isTest(file)) continue;
      const entry = hist.get(file);
      if (!entry) {
        hist.set(file, { firstSeenSha: sha, lastSeenSha: sha });
      } else {
        entry.lastSeenSha = sha;
      }
    }
  }
  return hist;
}

function detectRenames() {
  const renamedFrom = new Set<string>();
  const renamedTo = new Set<string>();
  try {
    let base = "";
    try {
      base = execSync("git merge-base HEAD origin/main", {
        encoding: "utf8",
      }).trim();
    } catch {
      base = execSync("git merge-base HEAD origin/master", {
        encoding: "utf8",
      }).trim();
    }
    const diff = execSync(
      `git diff --name-status --find-renames ${base} HEAD`,
      { encoding: "utf8" },
    )
      .trim()
      .split("\n");
    for (const line of diff) {
      if (line.startsWith("R")) {
        const parts = line.split(/\s+/);
        if (parts.length >= 3) {
          renamedFrom.add(parts[1]);
          renamedTo.add(parts[2]);
        }
      }
    }
  } catch {}
  return { renamedFrom, renamedTo };
}

function main() {
  const branch = execSync("git rev-parse --abbrev-ref HEAD", {
    encoding: "utf8",
  }).trim();
  const commit = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  const generatedAt = new Date().toISOString();

  const { packages, currentTests } = collectCurrent();
  const hist = collectHistorical();
  const { renamedFrom, renamedTo } = detectRenames();

  for (const [file, info] of hist.entries()) {
    const pkg = getPackageRoot(file);
    if (!packages[pkg]) packages[pkg] = { current: [], historical: [] };
    packages[pkg].historical.push({
      path: file,
      firstSeenSha: info.firstSeenSha,
      lastSeenSha: info.lastSeenSha,
    });
  }

  const currentSet = new Set(currentTests);
  const historicalSet = new Set(hist.keys());
  const missingNow = Array.from(historicalSet).filter(
    (p) => !currentSet.has(p) && !renamedFrom.has(p),
  );
  const newlyAdded = Array.from(currentSet).filter(
    (p) => !historicalSet.has(p) && !renamedTo.has(p),
  );

  const registry = {
    generatedAt,
    branch,
    commit,
    packages,
    totals: {
      currentCount: currentTests.length,
      historicalCount: historicalSet.size,
    },
  };

  fs.mkdirSync(path.join("tests"), { recursive: true });
  fs.writeFileSync(
    path.join("tests", "registry.json"),
    JSON.stringify(registry, null, 2),
  );

  let summary =
    `Test census for ${branch}@${commit}\n` +
    `Current tests: ${currentTests.length}\n` +
    `Historical tests: ${historicalSet.size}\n` +
    `Newly added: ${newlyAdded.length}\n` +
    `Missing: ${missingNow.length}`;
  if (missingNow.length > 0) {
    summary +=
      "\nMissing tests:\n" + missingNow.map((m) => ` - ${m}`).join("\n");
  }

  console.log(summary);
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (summaryFile) {
    fs.appendFileSync(summaryFile, summary + "\n");
  }

  if (missingNow.length > 0) {
    process.exit(1);
  }
}

main();
