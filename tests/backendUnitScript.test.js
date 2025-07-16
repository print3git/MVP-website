const pkg = require("../backend/package.json");

describe("backend test:unit script", () => {
  test("aliases to npm test", () => {
    expect(pkg.scripts["test:unit"]).toBe("npm test");
  });
});
