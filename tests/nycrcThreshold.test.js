const fs = require("fs");
const path = require("path");
const nycConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", ".nycrc"), "utf8"),
);
const jestConfig = require("../backend/jest.config.js");

describe("coverage thresholds", () => {
  test("nyc matches jest global thresholds", () => {
    const global = jestConfig.coverageThreshold.global;
    expect(nycConfig.branches).toBe(global.branches);
    expect(nycConfig.functions).toBe(global.functions);
    expect(nycConfig.lines).toBe(global.lines);
    expect(nycConfig.statements).toBe(global.statements);
  });
});
