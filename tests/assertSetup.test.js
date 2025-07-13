jest.mock("fs");
jest.mock("child_process");

const fs = require("fs");
const child_process = require("child_process");

describe("assert-setup script", () => {
  beforeEach(() => {
    jest.resetModules();
    fs.existsSync.mockReset();
    fs.readdirSync.mockReset();
    child_process.execSync.mockReset();
  });

  /** Set required environment variables for tests */
  function setEnv() {
    process.env.HF_TOKEN = "x";
    process.env.AWS_ACCESS_KEY_ID = "id";
    process.env.AWS_SECRET_ACCESS_KEY = "secret";
    process.env.CLOUDFRONT_MODEL_DOMAIN = "cdn.test";
  }

  test("runs setup when browsers missing", () => {
    setEnv();
    fs.existsSync.mockReturnValue(false);
    fs.readdirSync.mockReturnValue([]);

    expect(() => require("../scripts/assert-setup.js")).not.toThrow();
  });

  test("skips setup when browsers installed", () => {
    setEnv();
    fs.existsSync.mockReturnValue(true);
    fs.readdirSync.mockReturnValue(["chromium"]);

    expect(() => require("../scripts/assert-setup.js")).not.toThrow();
  });

  test("invokes validate-env when HF_TOKEN missing", () => {
    delete process.env.HF_TOKEN;
    process.env.AWS_ACCESS_KEY_ID = "id";
    process.env.AWS_SECRET_ACCESS_KEY = "secret";

    fs.existsSync.mockReturnValue(true);
    fs.readdirSync.mockReturnValue(["chromium"]);

    child_process.execSync.mockImplementation(() => {});

    expect(() => require("../scripts/assert-setup.js")).not.toThrow();
    expect(child_process.execSync).toHaveBeenCalledWith(
      "SKIP_NET_CHECKS=1 bash scripts/validate-env.sh >/dev/null",
      { stdio: "inherit" },
    );
  });

  test("skips network check when SKIP_NET_CHECKS is set", () => {
    setEnv();
    process.env.SKIP_NET_CHECKS = "1";
    fs.existsSync.mockReturnValue(true);
    fs.readdirSync.mockReturnValue(["chromium"]);
    child_process.execSync.mockImplementation(() => {});
    expect(() => require("../scripts/assert-setup.js")).not.toThrow();
    expect(child_process.execSync).toHaveBeenCalledWith(
      "SKIP_NET_CHECKS=1 bash scripts/validate-env.sh >/dev/null",
      { stdio: "inherit" },
    );
    expect(child_process.execSync).not.toHaveBeenCalledWith(
      "node scripts/network-check.js",
      expect.any(Object),
    );
    delete process.env.SKIP_NET_CHECKS;
  });
});
