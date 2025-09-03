const packageJson = require("../../package.json");

describe("package.json smoke script", () => {
  it("defines a smoke script", () => {
    expect(typeof packageJson.scripts?.smoke).toBe("string");
    expect(packageJson.scripts.smoke.length).toBeGreaterThan(0);
  });
});
