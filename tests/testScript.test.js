const pkg = require("../package.json");

describe("package.json test script", () => {
  test("uses run-jest.js", () => {
    expect(pkg.scripts.test).toBe("node scripts/run-jest.js");
  });
});
