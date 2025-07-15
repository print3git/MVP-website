const pkg = require("./../backend/package.json");

describe("backend package.json test script", () => {
  test("uses run-jest.js", () => {
    expect(pkg.scripts.test).toBe("node ../scripts/run-jest.js");
  });
});
