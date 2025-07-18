const pkg = require("../package.json");

describe("postbuild script", () => {
  test("uses non-interactive ts-node invocation", () => {
    expect(pkg.scripts.postbuild).toMatch(/npx --yes ts-node --transpile-only/);
  });
});
