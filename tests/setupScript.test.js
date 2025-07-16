const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

describe("setup script", () => {
  test("completes with SKIP_PW_DEPS=1", () => {
    execSync("SKIP_PW_DEPS=1 SKIP_NET_CHECKS=1 bash scripts/setup.sh", {
      stdio: "inherit",
    });
    const flag = path.join(__dirname, "..", ".setup-complete");
    const jestBin = path.join(__dirname, "..", "node_modules", ".bin", "jest");
    expect(fs.existsSync(flag)).toBe(true);
    expect(fs.existsSync(jestBin)).toBe(true);
  });

  test("setup.sh invokes check-host-deps script", () => {
    const content = fs.readFileSync(
      path.join(__dirname, "..", "scripts", "setup.sh"),
      "utf8",
    );
    expect(content).toMatch(/check-host-deps\.js/);
  });

  test("setup.sh activates mise for node", () => {
    const content = fs.readFileSync(
      path.join(__dirname, "..", "scripts", "setup.sh"),
      "utf8",
    );
    expect(content).toMatch(/mise activate bash/);
  });
});
