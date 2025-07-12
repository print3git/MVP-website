const rootPkg = require("../package.json");
const backendPkg = require("../backend/package.json");

describe("format scripts", () => {
  test("preformat hooks assert-setup", () => {
    expect(rootPkg.scripts.preformat).toBe("node scripts/assert-setup.js");
    expect(rootPkg.scripts["preformat:check"]).toBe(
      "node scripts/assert-setup.js",
    );
    expect(backendPkg.scripts.preformat).toBe(
      "node ../scripts/assert-setup.js",
    );
  });
});
