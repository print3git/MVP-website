const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

describe("no hidden global dependencies", () => {
  test("vite is not installed globally", () => {
    expect(() => execSync("which vite")).toThrow();
  });

  test("tsc is installed locally and not globally", () => {
    expect(() =>
      execSync("which tsc", { env: { PATH: "/usr/bin:/bin" } }),
    ).toThrow();
    const repoRoot = execSync("git rev-parse --show-toplevel")
      .toString()
      .trim();
    const localTsc = path.join(repoRoot, "node_modules", ".bin", "tsc");
    expect(fs.existsSync(localTsc)).toBe(true);
  });
});
