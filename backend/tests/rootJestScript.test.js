const rootPkg = require("../../package.json");

test("root package defines jest script", () => {
  expect(rootPkg.scripts.jest).toBe("node scripts/run-jest.js");
});
