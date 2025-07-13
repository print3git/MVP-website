const fs = require("fs");
const child_process = require("child_process");

jest.mock("fs");
jest.mock("child_process");

describe("ensure-root-deps", () => {
  beforeEach(() => {
    fs.existsSync.mockReset();
    child_process.execSync.mockReset();
  });

  test("checks network then installs", () => {
    fs.existsSync.mockReturnValue(false);
    require("../scripts/ensure-root-deps.js");
    const calls = child_process.execSync.mock.calls.map((c) => c[0]);
    expect(calls).toContain("npm ci");
  });

  test("retries on network failure", () => {
    fs.existsSync.mockReturnValue(false);
    child_process.execSync
      .mockImplementationOnce(() => {})
      .mockImplementationOnce(() => {
        throw new Error("ECONNRESET");
      })
      .mockImplementation(() => {});
    expect(() => require("../scripts/ensure-root-deps.js")).not.toThrow();
  });

  test("unsets npm proxy variables", () => {
    fs.existsSync.mockReturnValue(false);
    process.env.npm_config_http_proxy = "http://proxy";
    process.env.npm_config_https_proxy = "http://proxy";
    child_process.execSync.mockImplementation(() => {});
    require("../scripts/ensure-root-deps.js");
    const ciCall = child_process.execSync.mock.calls.find(
      (c) => c[0] === "npm ci",
    );
    const env = ciCall ? ciCall[1].env : {};
    expect(env.npm_config_http_proxy).toBeUndefined();
    expect(env.npm_config_https_proxy).toBeUndefined();
    delete process.env.npm_config_http_proxy;
    delete process.env.npm_config_https_proxy;
  });
});
