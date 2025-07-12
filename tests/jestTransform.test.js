const backendPkg = require("../backend/package.json");
const jestConfig = require("../backend/jest.config.js");

describe("jest setup", () => {
  test("babel-jest installed and ts transform configured", () => {
    expect(backendPkg.devDependencies["babel-jest"]).toBeDefined();
    expect(jestConfig.transform["^.+\\.[tj]s$"]).toBe("babel-jest");
  });
});
