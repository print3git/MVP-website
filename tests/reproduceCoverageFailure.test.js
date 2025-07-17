const fs = require("fs");
const { execSync } = require("child_process");

const nycrc = ".nycrc";
const backup = fs.readFileSync(nycrc, "utf8");

function run(cmd, opts = {}) {
  return execSync(cmd, { encoding: "utf8", ...opts });
}

describe("coverage failure reproduction", () => {
  beforeAll(() => {
    const high = {
      "check-coverage": true,
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
      reporter: ["lcov", "text", "json-summary"],
    };
    fs.writeFileSync(nycrc, JSON.stringify(high));
  });

  afterAll(() => {
    fs.writeFileSync(nycrc, backup);
  });

  test("fails coverage thresholds", () => {
    // run coverage on a single dummy test for speed
    run(
      "SKIP_PW_DEPS=1 npm run coverage --prefix backend backend/__tests__/dummyCoverage.test.js",
    );
    let error;
    try {
      run("node scripts/check-coverage.js");
    } catch (e) {
      error = e;
    }
    expect(error).toBeTruthy();
    expect(error.stdout || error.stderr).toMatch(
      /Coverage for (lines|functions|branches|statements)/,
    );
  });
});
