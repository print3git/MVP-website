const { execSync } = require("child_process");

describe("format script", () => {
  test("runs prettier successfully", () => {
    expect(() => {
      execSync("npm run format --silent", { cwd: __dirname + "/.." });
    }).not.toThrow();
  });

  test("does not modify ignored files", () => {
    const fs = require("fs");
    const path = require("path");
    const file = path.join(__dirname, "..", "..", "scripts", "ci_watchdog.js");
    const before = fs.readFileSync(file, "utf8");
    execSync("npm run format --silent", { cwd: path.join(__dirname, "..") });
    const after = fs.readFileSync(file, "utf8");
    expect(after).toBe(before);
  });
});
