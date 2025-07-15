const fs = require("fs");
const pkg = require("../package.json");

test("package.json has code scanning check script", () => {
  expect(pkg.scripts["check:code-scanning"]).toBe(
    "node scripts/check-code-scanning.js",
  );
});

test("check-code-scanning.js exists", () => {
  expect(fs.existsSync("scripts/check-code-scanning.js")).toBe(true);
});
