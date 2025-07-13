const rootPkg = require("../package.json");
const backendPkg = require("../backend/package.json");

describe("format scripts", () => {
  test("preformat hooks root deps check", () => {
    expect(rootPkg.scripts.preformat).toBe("node scripts/assert-setup.js");
    expect(rootPkg.scripts["preformat:check"]).toBe(
      "node scripts/assert-setup.js",
    );
    expect(backendPkg.scripts.preformat).toBe(
      "node ../scripts/ensure-root-deps.js",
    );
  });
});
