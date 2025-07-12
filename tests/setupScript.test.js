const fs = require("fs");
const path = require("path");

describe("setup script", () => {
  test("calls network-check before installing Playwright", () => {
    const content = fs.readFileSync(
      path.join(__dirname, "..", "scripts", "setup.sh"),
      "utf8",
    );
    const networkIdx = content.indexOf("node scripts/network-check.js");
    const installIdx = content.indexOf("npx playwright install");
    expect(networkIdx).toBeGreaterThanOrEqual(0);
    expect(installIdx).toBeGreaterThan(networkIdx);
  });
});
