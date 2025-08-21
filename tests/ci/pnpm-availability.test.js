const test = require("node:test");
const assert = require("node:assert/strict");
const cp = require("node:child_process");
const detect = require("../../scripts/ci/detect-package-manager");

test("pnpm availability", () => {
  const { pm, hasPnpm } = detect();
  if (pm !== "pnpm") return test.skip("project does not require pnpm");
  let hasCorepack = false;
  try {
    hasCorepack =
      cp.spawnSync("corepack", ["--version"], { stdio: "ignore" }).status === 0;
  } catch {
    hasCorepack = false;
  }
  if (!hasPnpm && !hasCorepack) {
    assert.fail(
      "pnpm unavailable in CI. Fix: add pnpm/action-setup@v3 (or corepack enable) before caching, or pin packageManager in package.json.",
    );
  }
});
