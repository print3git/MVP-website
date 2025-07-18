const path = require("path");
const pkg = require("../../backend/package.json");

const depsToCheck = ["stripe", "@aws-sdk/client-s3", "pg"];

describe("dependency sanity check", () => {
  test("required deps present with expected versions", () => {
    const missing = [];
    for (const dep of depsToCheck) {
      try {
        const pkgPath = path.join(
          __dirname,
          "..",
          "..",
          "backend",
          "node_modules",
          ...dep.split("/"),
          "package.json",
        );
        const { version } = require(pkgPath);
        console.log(`${dep} found, version ${version}`);
        const expected = pkg.dependencies[dep];
        if (expected && !version.startsWith(expected.replace(/^[^0-9]*/, ""))) {
          missing.push(
            `${dep} version mismatch: expected ${expected}, got ${version}`,
          );
        }
      } catch (_err) {
        console.log(`${dep} not found`);
        missing.push(`${dep} missing`);
      }
    }
    expect(missing).toEqual([]);
  });
});
