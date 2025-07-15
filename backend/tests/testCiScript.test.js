const pkg = require("../package.json");

describe("test-ci script", () => {
  test("uses jest config coverage settings", () => {
    expect(pkg.scripts["test-ci"]).toBe(
      "node ../scripts/run-jest.js --ci --coverage --maxWorkers=2 --forceExit",
    );
  });
});
