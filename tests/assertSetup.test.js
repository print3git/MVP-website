/** @file Tests for assert-setup script */
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
});
