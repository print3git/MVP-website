describe("package.json pretest", () => {
  test("includes assert-setup script", () => {
    const pkg = require("../package.json");
    expect(pkg.scripts.pretest).toMatch(/assert-setup/);
  });
});
