const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const lockPath = path.join(process.cwd(), "pnpm-lock.yaml");

test("pnpm lockfile parity", () => {
  if (!fs.existsSync(lockPath)) {
    return test.skip("no pnpm-lock.yaml");
  }
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const deps = Object.keys(
    Object.assign({}, pkg.dependencies, pkg.devDependencies),
  );
  let lock;
  try {
    const yaml = require("yaml");
    lock = yaml.parse(fs.readFileSync(lockPath, "utf8"));
  } catch (err) {
    return assert.fail(
      `pnpm-lock.yaml parse error: ${err.message}. Run pnpm install --no-frozen-lockfile locally and commit the updated lockfile.`,
    );
  }
  const specifiers = lock?.importers?.["."]?.specifiers || {};
  const missing = deps.filter((d) => !(d in specifiers));
  if (missing.length) {
    assert.fail(
      `pnpm-lock.yaml out of sync; missing specs for: ${missing.join(", ")}. Fix: run pnpm install --no-frozen-lockfile locally and commit the updated lockfile.`,
    );
  }
});
