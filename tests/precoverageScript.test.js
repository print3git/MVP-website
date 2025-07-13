describe("backend package.json precoverage", () => {
  test("runs ensure-deps before coverage", () => {
    const pkg = require("../backend/package.json");
    expect(pkg.scripts.precoverage).toMatch(/ensure-deps/);
  });
});
