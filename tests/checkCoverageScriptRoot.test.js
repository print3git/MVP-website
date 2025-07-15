const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const summary = path.join(__dirname, "..", "coverage", "coverage-summary.json");
const backup = summary + ".bak";
const nycrc = path.join(__dirname, "..", ".nycrc");
let originalConfig = fs.existsSync(nycrc) ? fs.readFileSync(nycrc, "utf8") : "";

describe("check-coverage script with root summary", () => {
  beforeAll(() => {
    if (fs.existsSync(summary)) fs.renameSync(summary, backup);
  });

  afterAll(() => {
    if (fs.existsSync(summary)) fs.unlinkSync(summary);
    if (fs.existsSync(backup)) fs.renameSync(backup, summary);
    if (originalConfig !== undefined) {
      fs.writeFileSync(nycrc, originalConfig);
    } else if (fs.existsSync(nycrc)) {
      fs.unlinkSync(nycrc);
    }
  });

  test("passes when coverage summary in repo root", () => {
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
      nycrc,
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
      {
        encoding: "utf8",
      },
    );
    expect(output).toMatch(/Coverage thresholds met/);
  });
});
