const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

describe("run-coverage script", () => {
  test("generates lcov report", () => {
    execFileSync(
      "node",
      ["scripts/run-coverage.js", "backend/tests/api.test.js"],
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
    const content = fs.readFileSync(file, "utf8");
    expect(content.length).toBeGreaterThan(0);
  });
});
