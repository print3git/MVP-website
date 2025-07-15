const fs = require("fs");
const path = require("path");

describe(".prettierignore", () => {
  test("ignores generated ci_watchdog.js", () => {
    const ignore = fs.readFileSync(
      path.join(__dirname, "..", ".prettierignore"),
      "utf8",
    );
    expect(ignore.split(/\r?\n/)).toContain("scripts/ci_watchdog.js");
  });
});
