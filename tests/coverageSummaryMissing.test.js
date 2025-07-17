const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const repoRoot = path.join(__dirname, "..");

describe("coverage summary check", () => {
  afterEach(() => {
    fs.rmSync(path.join(repoRoot, "coverage"), {
      recursive: true,
      force: true,
    });
    fs.rmSync(path.join(repoRoot, "backend", "coverage"), {
      recursive: true,
      force: true,
    });
  });

  test("fails when coverage summary missing", () => {
    const env = {
      ...process.env,
      SKIP_NET_CHECKS: "1",
      SKIP_DB_CHECK: "1",
      SKIP_PW_DEPS: "1",
      CI: "1",
    };
    let failed = false;
    try {
      execFileSync(
        "node",
        ["scripts/run-coverage.js", "backend/tests/failingCoverage.test.js"],
        {
          env,
          encoding: "utf8",
          stdio: "pipe",
        },
      );
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
    const summary = path.join(repoRoot, "coverage", "coverage-summary.json");
    expect(fs.existsSync(summary)).toBe(false);
  });
});
