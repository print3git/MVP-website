const rootPkg = require("../package.json");
const backendPkg = require("../backend/package.json");

describe("format scripts", () => {
  test("preformat hooks root deps check", () => {
    expect(rootPkg.scripts.preformat).toBe(
      "cross-env SKIP_NET_CHECKS=1 SKIP_PW_DEPS=1 node scripts/assert-setup.js",
    );
    expect(rootPkg.scripts["preformat:check"]).toBe(
      "cross-env SKIP_NET_CHECKS=1 SKIP_PW_DEPS=1 node scripts/assert-setup.js",
    );
    expect(backendPkg.scripts.preformat).toBe(
      "cross-env SKIP_NET_CHECKS=1 SKIP_PW_DEPS=1 node ../scripts/ensure-root-deps.js",
    );
  });
});
