const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");

describe("project structure", () => {
  test("backend package.json exists", () => {
    const pkg = path.join(repoRoot, "backend", "package.json");
    expect(fs.existsSync(pkg)).toBe(true);
  });
});
