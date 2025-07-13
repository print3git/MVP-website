const pkg = require("../backend/package.json");

describe("coverage script", () => {
  test("uses run-jest helper", () => {
    expect(pkg.scripts.coverage).toMatch(/run-jest\.js/);
  });
});
