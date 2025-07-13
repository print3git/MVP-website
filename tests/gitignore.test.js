const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");

describe(".gitignore", () => {
  test("ignores Playwright test results", () => {
    const gitignore = fs.readFileSync(
      path.join(repoRoot, ".gitignore"),
      "utf8",
    );
    expect(gitignore).toMatch(/test-results\//);
  });
});
