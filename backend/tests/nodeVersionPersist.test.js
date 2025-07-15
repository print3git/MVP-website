const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..", "..");

describe("setup script", () => {
  test("persists node version use command", () => {
    const script = fs.readFileSync(
      path.join(repoRoot, "scripts", "setup.sh"),
      "utf8",
    );
    expect(script).toMatch(/mise use -g node@20/);
  });
});
