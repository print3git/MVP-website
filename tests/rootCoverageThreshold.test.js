const jestConfig = require("../jest.config.js");

describe("root coverage thresholds", () => {
  test("thresholds are permissive", () => {
    const thr = jestConfig.coverageThreshold.global;
    expect(thr.lines).toBeLessThanOrEqual(5);
    expect(thr.statements).toBeLessThanOrEqual(5);
    expect(thr.functions).toBeLessThanOrEqual(5);
    expect(thr.branches).toBeLessThanOrEqual(5);
  });
});
