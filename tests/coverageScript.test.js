const pkg = require("../backend/package.json");

describe("coverage script", () => {
  test("uses run-jest helper", () => {
    expect(pkg.scripts.coverage).toMatch(/run-jest\.js/);
  });

  test("runs setup verifier before run-jest", () => {
    const script = pkg.scripts.coverage;
    const setupIdx = script.indexOf("assert-setup.js");
    const jestIdx = script.indexOf("run-jest.js");
    expect(setupIdx).toBeGreaterThan(-1);
    expect(jestIdx).toBeGreaterThan(-1);
    expect(setupIdx).toBeLessThan(jestIdx);
  });
});
