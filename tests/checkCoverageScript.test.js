const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const summary = path.join(__dirname, "..", "coverage", "coverage-summary.json");
const backup = summary + ".bak";
const nycrc = path.join(__dirname, "..", ".nycrc");
const nycBackup = nycrc + ".bak";
let originalConfig = fs.existsSync(nycrc) ? fs.readFileSync(nycrc, "utf8") : "";

describe("check-coverage script", () => {
  beforeAll(() => {
    if (fs.existsSync(summary)) fs.renameSync(summary, backup);
  });

  afterAll(() => {
    if (fs.existsSync(backup)) fs.renameSync(backup, summary);
    if (originalConfig !== undefined) {
      fs.writeFileSync(nycrc, originalConfig);
    } else if (fs.existsSync(nycrc)) {
      fs.unlinkSync(nycrc);
    }
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

    const prevConfig = fs.existsSync(nycrc)
      ? fs.readFileSync(nycrc, "utf8")
      : "";
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
      if (prevConfig !== undefined) {
        fs.writeFileSync(".nycrc", prevConfig);
      } else {
        fs.unlinkSync(nycrc);
      }
    }
  });

  test("passes when coverage meets thresholds", () => {
    const goodSummary = {
      total: {
        branches: { pct: 90 },
        functions: { pct: 90 },
        lines: { pct: 90 },
        statements: { pct: 90 },
      },
    };
    fs.mkdirSync(path.dirname(summary), { recursive: true });
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
