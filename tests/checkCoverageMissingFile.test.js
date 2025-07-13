const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

describe("check-coverage missing summary", () => {
  test("fails with helpful message", () => {
    const script = path.join(__dirname, "..", "scripts", "check-coverage.js");
    const summary = path.join(
      __dirname,
      "..",
      "backend",
      "coverage",
      "coverage-summary.json",
    );
    const backup = `${summary}.bak`;
    fs.renameSync(summary, backup);
    try {
      expect(() => execFileSync("node", [script], { stdio: "pipe" })).toThrow(
        /Coverage summary missing/,
      );
    } finally {
      fs.renameSync(backup, summary);
    }
  });
});
