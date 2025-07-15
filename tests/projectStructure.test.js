const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");

describe("project structure", () => {
  test("backend package.json exists", () => {
    const pkg = path.join(repoRoot, "backend", "package.json");
    expect(fs.existsSync(pkg)).toBe(true);
  });

  test("frontend utils directory does not exist", () => {
    const utilsDir = path.join(repoRoot, "frontend", "utils");
    expect(fs.existsSync(utilsDir)).toBe(false);
  });

  test("frontend helpers directory does not exist", () => {
    const helpersDir = path.join(repoRoot, "frontend", "helpers");
    expect(fs.existsSync(helpersDir)).toBe(false);
  });
});
