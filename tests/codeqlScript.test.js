const pkg = require("../package.json");

test("codeql script runs code scanning check", () => {
  expect(pkg.scripts.codeql).toBe("node scripts/check-code-scanning.js");
});
