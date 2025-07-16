const pkg = require("../package.json");

describe("codeql script", () => {
  test("package.json defines codeql script", () => {
    expect(pkg.scripts.codeql).toBeDefined();
  });
});
