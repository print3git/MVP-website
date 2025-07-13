const pkg = require("../package.json");

describe("coverage script", () => {
  test("invokes assert-setup before running backend coverage", () => {
    expect(
      pkg.scripts.coverage.startsWith("node scripts/assert-setup.js &&"),
    ).toBe(true);
  });
});
