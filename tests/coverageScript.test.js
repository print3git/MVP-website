const pkg = require("../backend/package.json");

describe("coverage script", () => {
  test("uses run-coverage helper", () => {
    expect(pkg.scripts.coverage).toMatch(/run-coverage\.js/);
  });
});
