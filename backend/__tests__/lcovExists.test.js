const fs = require("fs");
const path = require("path");

const lcov = path.join(__dirname, "..", "..", "coverage", "lcov.info");

const shouldCheck = process.env.CHECK_LCOV === "1";
(shouldCheck ? test : test.skip)("lcov.info exists and is valid", () => {
  expect(fs.existsSync(lcov)).toBe(true);
  const content = fs.readFileSync(lcov, "utf8");
  expect(/^(TN|SF):/m.test(content)).toBe(true);
});
