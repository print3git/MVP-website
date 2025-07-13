const fs = require("fs");
const path = require("path");

describe("root dependencies", () => {
  test("cross-spawn is installed", () => {
    const pkgPath = path.join(__dirname, "..", "node_modules", "cross-spawn");
    expect(fs.existsSync(pkgPath)).toBe(true);
    expect(() => require("cross-spawn")).not.toThrow();
  });
});
