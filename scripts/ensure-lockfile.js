#!/usr/bin/env node
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

if (!existsSync("package-lock.json") && !existsSync("pnpm-lock.yaml")) {
  console.error("❌  No lock file found. Run: npm install OR pnpm install");
  process.exit(1);
}

try {
  // sync npm lockfile *silently* – don’t break PRs
  execSync("npm install --package-lock-only --ignore-scripts", {
    stdio: "ignore",
  });
} catch {
  /* ignore */
}

const dirty = execSync("git diff --name-only package-lock.json pnpm-lock.yaml")
  .toString()
  .trim();
if (dirty) {
  console.error(
    "\n❌  Lock file drift detected.\n   👉  Fix locally with: npm run fix-lockfile",
  );
  process.exit(1);
}
console.log("✅  Lock file up-to-date");
