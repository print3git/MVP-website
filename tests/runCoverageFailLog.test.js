const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const repoRoot = path.join(__dirname, "..");

describe("run-coverage failure log", () => {
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

  test("writes failed.log with failing test output", () => {
    const env = {
      ...process.env,
      SKIP_NET_CHECKS: "1",
      SKIP_DB_CHECK: "1",
      SKIP_PW_DEPS: "1",
    };
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
      throw new Error("coverage unexpectedly succeeded");
    } catch (err) {
      expect(err.status).not.toBe(0);
      const logPath = path.join(repoRoot, "coverage", "failed.log");
      expect(fs.existsSync(logPath)).toBe(true);
      const log = fs.readFileSync(logPath, "utf8");
      expect(log).toMatch(/failingCoverage\.test\.js/);
    }
  });
});
