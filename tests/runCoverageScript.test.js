const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

describe("run-coverage script", () => {
  test("generates lcov report", () => {
    execFileSync(
      "node",
      ["scripts/run-coverage.js", "backend/tests/analytics.test.js"],
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
    const file = path.join("coverage", "lcov.info");
    expect(fs.existsSync(file)).toBe(true);
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

  test("strips trailing logs", () => {
    execFileSync(
      "node",
      ["scripts/run-coverage.js", "backend/tests/logAfterExit.test.js"],
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
    const file = path.join("coverage", "lcov.info");
    const content = fs.readFileSync(file, "utf8");
    expect(content.trim().endsWith("end_of_record")).toBe(true);
    expect(content).not.toMatch(/AFTER_EXIT/);
  });
});
