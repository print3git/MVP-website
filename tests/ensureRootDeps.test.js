const fs = require("fs");
const child_process = require("child_process");

jest.mock("fs");
jest.mock("child_process");

describe("ensure-root-deps", () => {
  beforeEach(() => {
    fs.existsSync.mockReset();
    child_process.execSync.mockReset();
    process.exit = jest.fn();
  });

  test("checks network then installs", () => {
    fs.existsSync.mockReturnValue(false);
    jest.isolateModules(() => {
      require("../scripts/ensure-root-deps.js");
    });
    const calls = child_process.execSync.mock.calls.map((c) => c[0]);
    expect(calls).toContain("npm ci");
  });

  test("retries on network failure", () => {
    fs.existsSync.mockReturnValue(false);
    child_process.execSync
      .mockImplementationOnce(() => {})
      .mockImplementationOnce(() => {})
      .mockImplementationOnce(() => {
        throw new Error("ECONNRESET");
      })
      .mockImplementation(() => {});
    expect(() =>
      jest.isolateModules(() => {
        require("../scripts/ensure-root-deps.js");
      }),
    ).not.toThrow();
    expect(process.exit).not.toHaveBeenCalled();
    expect(child_process.execSync.mock.calls.length).toBeGreaterThan(1);
  });

  test("unsets npm proxy variables", () => {
    fs.existsSync.mockReturnValue(false);
    process.env.npm_config_http_proxy = "http://proxy";
    process.env.npm_config_https_proxy = "http://proxy";
    child_process.execSync.mockImplementation(() => {});
    jest.isolateModules(() => {
      require("../scripts/ensure-root-deps.js");
    });
    const ciCall = child_process.execSync.mock.calls.find(
      (c) => c[0] === "npm ci",
    );
    const env = ciCall ? ciCall[1].env : {};
    expect(env.npm_config_http_proxy).toBeUndefined();
    expect(env.npm_config_https_proxy).toBeUndefined();
    delete process.env.npm_config_http_proxy;
    delete process.env.npm_config_https_proxy;
  });

  test("fails when node version is too low", () => {
    fs.existsSync.mockReturnValue(true);
    const originalVersions = process.versions;
    Object.defineProperty(process, "versions", {
      value: { ...process.versions, node: "18.0.0" },
    });
    jest.isolateModules(() => {
      require("../scripts/ensure-root-deps.js");
    });
    expect(process.exit).toHaveBeenCalledWith(1);
    Object.defineProperty(process, "versions", { value: originalVersions });
  });
});
