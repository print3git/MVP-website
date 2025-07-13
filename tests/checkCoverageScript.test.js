const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

describe("check-coverage script", () => {
  test("passes with generated coverage", () => {
    execFileSync(
      "node",
      ["scripts/run-coverage.js", "backend/tests/dev-server.test.ts"],
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
    execFileSync("node", ["scripts/check-coverage.js"], {
      env: {
        ...process.env,
        SKIP_NET_CHECKS: "1",
        SKIP_DB_CHECK: "1",
        SKIP_PW_DEPS: "1",
      },
      encoding: "utf8",
    });
    const summary = path.join("backend", "coverage", "coverage-summary.json");
    expect(fs.existsSync(summary)).toBe(true);
  });
});
