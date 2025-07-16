const { execSync } = require("child_process");

// Ensure the codeql script runs without error. It should exit with code 0
// even when GITHUB_TOKEN is missing, as the script skips the check.
test("npm run codeql executes successfully", () => {
  expect(() => {
    execSync("npm run codeql", { stdio: "pipe" });
  }).not.toThrow();
});
