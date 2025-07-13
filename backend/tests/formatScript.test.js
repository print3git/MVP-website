const { execSync } = require("child_process");

describe("format script", () => {
  test("runs prettier successfully", () => {
    expect(() => {
      execSync("npm run format --silent", { cwd: __dirname + "/.." });
    }).not.toThrow();
  });
});
