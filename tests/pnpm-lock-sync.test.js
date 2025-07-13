const fs = require("fs");
const path = require("path");
const YAML = require("yaml");

/**
 * Verify the pnpm lock file matches dependencies for the given directory.
 * @param {string} dir directory to check
 */
function verifyPnpmLockSync(dir) {
  const pkgPath = path.join(dir, "package.json");
  const lockPath = path.join(dir, "pnpm-lock.yaml");
  expect(fs.existsSync(pkgPath)).toBe(true);
  expect(fs.existsSync(lockPath)).toBe(true);
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const lock = YAML.parse(fs.readFileSync(lockPath, "utf8"));
  const importer = lock.importers && lock.importers["."];
  expect(importer).toBeDefined();
  const expected = { ...pkg.dependencies, ...pkg.devDependencies };
  const actual = {
    ...(importer.dependencies || {}),
    ...(importer.devDependencies || {}),
  };
  for (const [name, spec] of Object.entries(expected)) {
    expect(actual[name]).toBeDefined();
    expect(actual[name]).toBe(spec);
  }
}

describe("pnpm-lock sync", () => {
  test("pnpm-lock.yaml matches package.json", () => {
    verifyPnpmLockSync(path.resolve(__dirname, ".."));
  });
});
