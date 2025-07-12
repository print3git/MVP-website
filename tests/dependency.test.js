const fs = require("fs");
const path = require("path");
const os = require("os");

describe("environment", () => {
  test("jest binary installed", () => {
    const bin = path.join(__dirname, "..", "node_modules", ".bin", "jest");
    expect(fs.existsSync(bin)).toBe(true);
  });

  test("backend jest binary installed", () => {
    const bin = path.join(
      __dirname,
      "..",
      "backend",
      "node_modules",
      ".bin",
      "jest",
    );
    expect(fs.existsSync(bin)).toBe(true);
  });

  test("prettier binary installed", () => {
    const bin = path.join(__dirname, "..", "node_modules", ".bin", "prettier");
    expect(fs.existsSync(bin)).toBe(true);
  });

  test("backend prettier binary installed", () => {
    const bin = path.join(
      __dirname,
      "..",
      "backend",
      "node_modules",
      ".bin",
      "prettier",
    );
    expect(fs.existsSync(bin)).toBe(true);
  });

  test("setup script has been run", () => {
    const flag = path.join(__dirname, "..", ".setup-complete");
    expect(fs.existsSync(flag)).toBe(true);
  });

  test("playwright browsers installed", () => {
    const envPath = process.env.PLAYWRIGHT_BROWSERS_PATH;
    const defaultPath = path.join(os.homedir(), ".cache", "ms-playwright");
    const browserPath = envPath || defaultPath;
    let installed = false;
    try {
      installed =
        fs.existsSync(browserPath) && fs.readdirSync(browserPath).length > 0;
    } catch {
      installed = false;
    }
    expect(installed).toBe(true);
  });

  test("@babel/plugin-syntax-typescript installed", () => {
    expect(() => require("@babel/plugin-syntax-typescript")).not.toThrow();
  });
});
