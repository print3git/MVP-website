const pkg = require("../package.json");

describe("scripts", () => {
  test("serve does not reference missing build script", () => {
    const serve = pkg.scripts && pkg.scripts.serve;
    expect(serve).toBeDefined();
    const referencesBuild = /npm run build/.test(serve);
    const hasBuild = Object.prototype.hasOwnProperty.call(pkg.scripts, "build");
    if (referencesBuild) {
      expect(hasBuild).toBe(true);
    }
  });
});
