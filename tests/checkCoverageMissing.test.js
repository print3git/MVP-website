const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

describe("check-coverage script", () => {
  test("fails when coverage summary is missing", () => {
    const tmp = fs.mkdtempSync(path.join(__dirname, "tmp-"));
    fs.copyFileSync(
      path.join(__dirname, "..", ".nycrc"),
      path.join(tmp, ".nycrc"),
    );
    try {
      execFileSync(
        "node",
        [path.resolve(__dirname, "..", "scripts", "check-coverage.js")],
        {
          cwd: tmp,
          encoding: "utf8",
          stdio: "pipe",
        },
      );
      throw new Error("script did not exit");
    } catch (err) {
      const output = (err.stdout || "") + (err.stderr || "");
      expect(output).toMatch(/coverage summary not found/i);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
