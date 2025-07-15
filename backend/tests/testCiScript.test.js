const pkg = require("../package.json");

describe("test-ci script", () => {
  test("uses jest config coverage settings", () => {
    expect(pkg.scripts["test-ci"]).toBe(
      "jest --ci --coverage --maxWorkers=2 --forceExit",
    );
  });
});
