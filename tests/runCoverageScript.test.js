const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

describe("run-coverage script", () => {
  test("generates lcov report", () => {
    execFileSync(
      "node",
      ["scripts/run-coverage.js", "backend/tests/awsCredentials.test.ts"],
      {
        env: {
          ...process.env,
          SKIP_NET_CHECKS: "1",
          SKIP_DB_CHECK: "1",
          SKIP_PW_DEPS: "1",
        },
        encoding: "utf8",
      },
    );
    const lcov = path.join("coverage", "lcov.info");
    const summary = path.join("backend", "coverage", "coverage-summary.json");
    expect(fs.existsSync(lcov)).toBe(true);
    expect(fs.existsSync(summary)).toBe(true);
  });

  test("fails when coverage cannot be parsed", () => {
    expect(() =>
      execFileSync(
        "node",
        ["scripts/run-coverage.js", "tests/fixtures/failing.js"],
        {
          env: {
            ...process.env,
            SKIP_NET_CHECKS: "1",
            SKIP_DB_CHECK: "1",
            SKIP_PW_DEPS: "1",
          },
          encoding: "utf8",
        },
      ),
    ).toThrow(/Failed to parse LCOV/);
  });
});
