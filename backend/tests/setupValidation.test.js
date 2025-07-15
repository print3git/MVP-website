const fs = require("fs");
const os = require("os");
const path = require("path");

describe("environment setup", () => {
  test("setup script has been run", () => {
    const setupPath = path.resolve(__dirname, "../../.setup-complete");
    expect(fs.existsSync(setupPath)).toBe(true);
  });

  test("playwright browsers installed", () => {
    const browserPath =
      process.env.PLAYWRIGHT_BROWSERS_PATH ||
      path.join(os.homedir(), ".cache", "ms-playwright");
    expect(fs.existsSync(browserPath)).toBe(true);
    expect(fs.readdirSync(browserPath).length).toBeGreaterThan(0);
  });

  test("backend jest installed", () => {
    const jestBin = path.resolve(__dirname, "../node_modules/.bin/jest");
    expect(fs.existsSync(jestBin)).toBe(true);
  });
});
