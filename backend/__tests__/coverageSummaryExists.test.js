const fs = require("fs");

const summary = "coverage/coverage-summary.json";

(process.env.CI ? test : test.skip)("coverage summary exists", () => {
  expect(fs.existsSync(summary)).toBe(true);
});
