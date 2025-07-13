const fs = require("fs");
const pkg = JSON.parse(fs.readFileSync("backend/package.json", "utf8"));

describe("coverage-lcov script", () => {
  test("outputs lcov reporter", () => {
    const script = pkg.scripts["coverage-lcov"];
    expect(script).toBeDefined();
    expect(script).toContain("--coverageReporters=text-lcov");
  });
});
