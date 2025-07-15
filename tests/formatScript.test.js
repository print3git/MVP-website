const rootPkg = require("../package.json");
const backendPkg = require("../backend/package.json");

describe("format scripts", () => {
  test("preformat hooks root deps check", () => {
    expect(rootPkg.scripts.preformat).toBe("node scripts/preformat.js");
    expect(rootPkg.scripts["preformat:check"]).toBe(
      "node scripts/preformat.js",
    );
    expect(backendPkg.scripts.preformat).toBe(
      "node ../scripts/ensure-root-deps.js",
    );
  });

  test("format scripts run with minimal output", () => {
    expect(rootPkg.scripts.format).toContain("--log-level warn");
    expect(rootPkg.scripts["format:check"]).toContain("--log-level warn");
    expect(backendPkg.scripts.format).toContain("--log-level warn");
    expect(backendPkg.scripts["format:check"]).toContain("--log-level warn");
  });
});
