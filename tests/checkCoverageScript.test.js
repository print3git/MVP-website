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
const nycrc = path.join(__dirname, "..", ".nycrc");
const nycBackup = nycrc + ".bak";

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

  test("fails when coverage below threshold", () => {
    const originalConfig = fs.existsSync(".nycrc")
      ? fs.readFileSync(".nycrc", "utf8")
      : "";
    const data = {
      total: {
        branches: { pct: 0 },
        functions: { pct: 0 },
        lines: { pct: 0 },
        statements: { pct: 0 },
      },
    };
    fs.writeFileSync(summary, JSON.stringify(data));
    if (fs.existsSync(nycrc)) fs.renameSync(nycrc, nycBackup);
    fs.writeFileSync(
      nycrc,
      JSON.stringify({
        "check-coverage": true,
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      }),
    );
    try {
      execFileSync("node", [path.join("scripts", "check-coverage.js")], {
        encoding: "utf8",
        stdio: "pipe",
      });
      throw new Error("script did not exit");
    } catch (err) {
      const output = (err.stdout || "") + (err.stderr || "");
      expect(output).toMatch(/does not meet threshold/);
    } finally {
      fs.unlinkSync(summary);
      fs.writeFileSync(".nycrc", originalConfig);
    }
  });

  test("passes when coverage meets thresholds", () => {
    const originalConfig = fs.readFileSync(".nycrc", "utf8");
    const goodSummary = {
      total: {
        branches: { pct: 90 },
        functions: { pct: 90 },
        lines: { pct: 90 },
        statements: { pct: 90 },
      },
    };
    fs.writeFileSync(summary, JSON.stringify(goodSummary));
    fs.writeFileSync(
      ".nycrc",
      JSON.stringify({
        "check-coverage": true,
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      }),
    );
    const output = execFileSync(
      "node",
      [path.join("scripts", "check-coverage.js")],
      { encoding: "utf8" },
    );
    expect(output).toMatch(/Coverage thresholds met/);
    fs.unlinkSync(summary);
    fs.writeFileSync(".nycrc", originalConfig);
  });
});
