// Test Watchdog: detect "no tests ran" or sudden collapses in test counts.
// - Discovers test files via common CLIs when present (Jest, Playwright, Vitest, Mocha),
//   otherwise falls back to fast static globs.
// - Compares against ci/test-baseline.json and fails on large drops or zero tests.
// - To intentionally allow a drop, include "[ci-allow-test-drop]" in the commit/PR title.

import fs from "fs";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import glob from "glob";
import yaml from "yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.join(__dirname, "../../");
const baselinePath = path.join(repoRoot, "ci/test-baseline.json");

const ALLOW_TAG = /\bci-allow-test-drop\b/i;
const SOFT_DROP_THRESHOLD = 0.3; // fail if >30% drop vs baseline

const COMMIT_MSG = process.env.COMMIT_MSG || "";
const allowDrop = ALLOW_TAG.test(COMMIT_MSG);

function safeExec(cmd) {
  try {
    return execSync(cmd, {
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
    }).trim();
  } catch {
    return "";
  }
}

// Detect CLIs
const has = {
  jest: !!safeExec("npx --yes jest --version"),
  vitest: !!safeExec("npx --yes vitest --version"),
  playwright: !!safeExec("npx --yes playwright --version"),
  mocha: !!safeExec("npx --yes mocha --version"),
};

// Collect counts by runner (prefer list commands; fallback to globs)
function countByJest() {
  const out = safeExec("npx --yes jest --listTests");
  if (!out) return 0;
  return out.split("\n").filter(Boolean).length;
}
function countByVitest() {
  const out = safeExec("npx --yes vitest list --reporter=json");
  if (!out) return 0;
  try {
    // vitest prints json lines; count test files
    const lines = out.split("\n").filter(Boolean);
    let files = 0;
    for (const line of lines) {
      try {
        const j = JSON.parse(line);
        if (Array.isArray(j.files)) files += j.files.length;
      } catch {}
    }
    return files;
  } catch {
    return 0;
  }
}
function countByPlaywright() {
  // latest supports "playwright list"
  const out = safeExec("npx --yes playwright list || true");
  if (!out) return 0;
  // lines like "• tests/example.spec.ts"
  return out
    .split("\n")
    .filter(
      (l) => l.trim().length && !l.includes("Running") && !l.includes("Error"),
    ).length;
}
function countByMocha() {
  // mocha lacks list; fall back to glob
  return glob.sync("**/*.test.{js,jsx,ts,tsx}", {
    cwd: repoRoot,
    ignore: ["**/node_modules/**", "**/dist/**", "**/build/**"],
  }).length;
}

function countByGlobs() {
  return glob.sync("**/*.{test,spec}.{js,jsx,ts,tsx}", {
    cwd: repoRoot,
    ignore: ["**/node_modules/**", "**/dist/**", "**/build/**"],
  }).length;
}

const counts = {
  jest: has.jest ? countByJest() : 0,
  vitest: has.vitest ? countByVitest() : 0,
  playwright: has.playwright ? countByPlaywright() : 0,
  mocha: has.mocha ? countByMocha() : 0,
  globs: countByGlobs(),
};

// Consolidate: prefer explicit runners, fall back to glob if those are zero
let discovered = counts.jest + counts.vitest + counts.playwright + counts.mocha;
if (discovered === 0) discovered = counts.globs;

const now = new Date().toISOString();
console.log("Test Watchdog — discovery summary @", now);
console.table(counts);
console.log("Total discovered test files:", discovered);

// Load or seed baseline
let baseline = { min: 0, last: 0, updatedAt: now };
if (fs.existsSync(baselinePath)) {
  try {
    baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
  } catch {
    /* keep defaults */
  }
} else {
  // seed from current discovery, but don't write here (CI may be read-only)
  baseline.min = Math.max(
    1,
    Math.floor(discovered * (1 - SOFT_DROP_THRESHOLD)),
  );
  baseline.last = discovered;
}

// Decision logic
let failReason = "";
if (discovered === 0) {
  failReason =
    "No tests discovered (0). This likely indicates CI trigger/workflow regression.";
} else {
  const floor = Math.min(baseline.last, Math.max(1, baseline.min));
  const threshold = Math.floor(floor * (1 - SOFT_DROP_THRESHOLD));
  if (!allowDrop && discovered < threshold) {
    failReason = `Test count drop detected. Discovered=${discovered}, threshold=${threshold}, baseline.last=${baseline.last}, baseline.min=${baseline.min}`;
  }
}

if (failReason) {
  console.error("❌ Test Watchdog FAILED:", failReason);
  console.error(
    'Add "[ci-allow-test-drop]" to the commit/PR title only if this reduction is intentional.',
  );
  process.exit(1);
} else {
  console.log(
    "✅ Test Watchdog OK. Tests exist and no material drop detected.",
  );
}
