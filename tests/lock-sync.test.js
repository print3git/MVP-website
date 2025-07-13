/** @file Ensure each package-lock.json matches its package.json */
const fs = require("fs");
const path = require("path");
/**
 * Verify that package-lock.json matches package.json in the given directory.
 * @param {string} dir directory to validate
 */
function verifyLockSync(dir) {
  const pkgPath = path.join(dir, "package.json");
  const lockPath = path.join(dir, "package-lock.json");
  expect(fs.existsSync(pkgPath)).toBe(true);
  expect(fs.existsSync(lockPath)).toBe(true);
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
  const expected = {
    ...(pkg.dependencies || {}),
    ...(pkg.devDependencies || {}),
  };
  const rootLock = lock.packages && lock.packages[""] ? lock.packages[""] : {};
  const actual = {
    ...(rootLock.dependencies || {}),
    ...(rootLock.devDependencies || {}),
  };
  for (const [name, spec] of Object.entries(expected)) {
    expect(actual[name]).toBeDefined();
    expect(actual[name]).toBe(spec);
    expect(lock.packages[`node_modules/${name}`]).toBeDefined();
  }
}

describe("package-lock sync", () => {
  const dirs = [".", "backend", path.join("backend", "dalle_server")];
  for (const dir of dirs) {
    test(`${dir}/package-lock.json matches package.json`, () => {
      verifyLockSync(path.resolve(__dirname, "..", dir));
    });
  }
});
