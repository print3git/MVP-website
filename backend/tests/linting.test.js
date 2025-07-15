const { execSync } = require("child_process");

describe("linting", () => {
  test.skip("repository has no ESLint warnings", () => {
    expect(() => {
      execSync("npm run lint --silent", { stdio: "pipe" });
    }).not.toThrow();
  });
});
