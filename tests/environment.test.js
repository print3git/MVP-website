const { execSync } = require("child_process");

describe("environment checks", () => {
  test("node version is at least 20", () => {
    const major = parseInt(process.versions.node.split(".")[0], 10);
    expect(major).toBeGreaterThanOrEqual(20);
  });

  test("lock file contains all devDependencies", () => {
    execSync("node scripts/check-lockfile.js");
  });

  test("pnpm lock file matches package.json", () => {
    execSync("node scripts/check-pnpm-lockfile.js");
  });
});
