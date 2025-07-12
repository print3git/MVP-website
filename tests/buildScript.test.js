const pkg = require("../package.json");

test("build script exists", () => {
  expect(typeof pkg.scripts?.build).toBe("string");
});
