const fs = require("fs");
const path = require("path");
const pkg = require("../package.json");

describe("diagnose script", () => {
  test("package.json invokes diagnose.sh", () => {
    expect(pkg.scripts.diagnose).toBe("bash scripts/diagnose.sh");
  });

  test("diagnose.sh runs environment checks and pipeline test", () => {
    const content = fs.readFileSync(
      path.join(__dirname, "..", "scripts", "diagnose.sh"),
      "utf8",
    );
    expect(content).toMatch(/source scripts\/validate-env\.sh/);
    expect(content).toMatch(/test-full-pipeline\.js/);
    expect(content).toMatch(/DIAGNOSTICS PASSED/);
    expect(content).toMatch(/run-jest\.js/);
  });
});
