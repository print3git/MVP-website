/** @file Ensure setup.sh auto-skips Playwright deps on apt failure */
const fs = require("fs");
const path = require("path");

describe("setup script apt-get failure", () => {
  test("contains fallback logic when apt-get update fails", () => {
    const content = fs.readFileSync(
      path.join(__dirname, "..", "scripts", "setup.sh"),
      "utf8",
    );
    expect(content).toMatch(
      /apt-get update failed after 3 attempts, skipping Playwright system dependencies/,
    );
  });
});
