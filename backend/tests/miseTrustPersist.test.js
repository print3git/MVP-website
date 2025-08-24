const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..", "..");
const script = path.join(repoRoot, "scripts", "setup.sh");

describe("setup script", () => {
  test("persists mise trust command", () => {
    const content = fs.readFileSync(script, "utf8");
    expect(content).toMatch(/mise trust \$\(pwd\).*\|\| true/);
  });
});
