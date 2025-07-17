const fs = require("fs");
const path = require("path");
const { checkCoverageThresholds } = require("../scripts/run-coverage.js");
const jestConfig = require("../jest.config.js");

jest.mock("fs");

describe("checkCoverageThresholds", () => {
  const summaryPath = path.join("coverage", "coverage-summary.json");
  const base = jestConfig.coverageThreshold.global;

  afterEach(() => {
    jest.resetAllMocks();
  });

  test("passes when all metrics meet thresholds", () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(
      JSON.stringify({
        total: {
          branches: { pct: base.branches + 10 },
          functions: { pct: base.functions + 10 },
          lines: { pct: base.lines + 10 },
          statements: { pct: base.statements + 10 },
        },
      }),
    );
    expect(() => checkCoverageThresholds(summaryPath)).not.toThrow();
  });

  test("fails when a metric is below threshold", () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(
      JSON.stringify({
        total: {
          branches: { pct: base.branches - 5 },
          functions: { pct: base.functions + 10 },
          lines: { pct: base.lines + 10 },
          statements: { pct: base.statements + 10 },
        },
      }),
    );
    expect(() => checkCoverageThresholds(summaryPath)).toThrow(/branches/);
  });
});
