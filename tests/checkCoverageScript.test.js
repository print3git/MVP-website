const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const summary = path.join(
  __dirname,
  "..",
  "backend",
  "coverage",
  "coverage-summary.json",
);
const backup = summary + ".bak";

describe("check-coverage script", () => {
  beforeAll(() => {
    if (fs.existsSync(summary)) fs.renameSync(summary, backup);
  });

  afterAll(() => {
    if (fs.existsSync(backup)) fs.renameSync(backup, summary);
  });

  test("fails gracefully when summary missing", () => {
    try {
      execFileSync("node", [path.join("scripts", "check-coverage.js")], {
        encoding: "utf8",
        stdio: "pipe",
      });
      throw new Error("script did not exit");
    } catch (err) {
      const output = (err.stdout || "") + (err.stderr || "");
      expect(output).toMatch(/Missing coverage summary/);
    }
  });

  test("skips check when SKIP_COVERAGE_CHECK=1", () => {
    const output = execFileSync(
      "node",
      [path.join("scripts", "check-coverage.js")],
      {
        encoding: "utf8",
        stdio: "pipe",
        env: { ...process.env, SKIP_COVERAGE_CHECK: "1" },
      },
    );
    expect(output).toMatch(/Skipping coverage check/);
  });
});
