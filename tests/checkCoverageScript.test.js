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
      expect(output).toMatch(/Coverage for lines 0%/);
    }
    fs.unlinkSync(summary);
    fs.unlinkSync(nycrc);
    if (fs.existsSync(nycBackup)) fs.renameSync(nycBackup, nycrc);
  });
});
