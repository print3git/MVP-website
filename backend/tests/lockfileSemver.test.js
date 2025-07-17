const semver = require("semver");
const rootPkg = require("../../package.json");
const rootLock = require("../../package-lock.json");
const backendPkg = require("../package.json");
const backendLock = require("../package-lock.json");

function checkSync(pkgJson, lockJson) {
  const mismatched = [];
  const allDeps = { ...pkgJson.dependencies, ...pkgJson.devDependencies };
  for (const [dep, range] of Object.entries(allDeps)) {
    const entry = lockJson.packages?.[`node_modules/${dep}`];
    if (!entry) {
      mismatched.push(`${dep} missing`);
      continue;
    }
    if (!semver.satisfies(entry.version, range, { includePrerelease: true })) {
      mismatched.push(`${dep} expected ${range} but got ${entry.version}`);
    }
  }
  return mismatched;
}

test.skip("root lockfile versions satisfy package.json", () => {
  expect(checkSync(rootPkg, rootLock)).toEqual([]);
});

test.skip("backend lockfile versions satisfy package.json", () => {
  expect(checkSync(backendPkg, backendLock)).toEqual([]);
});
