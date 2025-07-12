const fs = require("fs");
const path = require("path");
const pkg = require("../package.json");

describe("smoke script", () => {
  test("uses run-smoke.js", () => {
    expect(pkg.scripts.smoke).toBe("node scripts/run-smoke.js");
  });

  test("run-smoke.js checks SKIP_PW_DEPS", () => {
    const content = fs.readFileSync(
      path.join(__dirname, "..", "scripts", "run-smoke.js"),
      "utf8",
    );
    expect(/SKIP_PW_DEPS/.test(content)).toBe(true);
  });

  test("run-smoke.js validates env before setup", () => {
    const content = fs.readFileSync(
      path.join(__dirname, "..", "scripts", "run-smoke.js"),
      "utf8",
    );
    const validateIdx = content.indexOf("npm run validate-env");
    const setupIdx = content.indexOf("npm run setup");
    expect(validateIdx).toBeGreaterThan(-1);
    expect(setupIdx).toBeGreaterThan(validateIdx);
  });
});
