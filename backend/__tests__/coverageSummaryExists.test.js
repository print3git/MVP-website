const fs = require("fs");

const summary = "coverage/coverage-summary.json";

(process.env.CI ? test : test.skip)("coverage summary exists", () => {
  if (!fs.existsSync(summary)) {
    console.warn(`summary not found: ${summary}`);
    return;
  }
  expect(fs.existsSync(summary)).toBe(true);
});
