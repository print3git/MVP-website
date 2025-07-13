const jestConfig = require("../backend/jest.config.js");

describe("coverage reporters", () => {
  test("includes json-summary for coverage-badges", () => {
    expect(jestConfig.coverageReporters).toContain("json-summary");
  });
});
