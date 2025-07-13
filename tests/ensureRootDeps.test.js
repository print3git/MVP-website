let fs;
let child_process;

jest.mock("fs");
jest.mock("child_process");

describe("ensure-root-deps", () => {
  beforeEach(() => {
    jest.resetModules();
    fs = require("fs");
    child_process = require("child_process");
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
    process.env.SKIP_NET_CHECKS = "1";
    child_process.execSync.mockImplementation((cmd) => {
      if (cmd === "npm ci" && !child_process.execSync.failed) {
        child_process.execSync.failed = true;
        throw new Error("ECONNRESET");
      }
    });
    require("../scripts/ensure-root-deps.js");
    const npmCiCalls = child_process.execSync.mock.calls.filter(
      ([c]) => c === "npm ci",
    ).length;
    expect(npmCiCalls).toBeGreaterThan(1);
    delete process.env.SKIP_NET_CHECKS;
  });

  test("skips network check when SKIP_NET_CHECKS is set", () => {
    fs.existsSync.mockReturnValue(false);
    process.env.SKIP_NET_CHECKS = "1";
    require("../scripts/ensure-root-deps.js");
    const calls = child_process.execSync.mock.calls.map((c) => c[0]);
    expect(calls.some((cmd) => cmd.includes("network-check.js"))).toBe(false);
    delete process.env.SKIP_NET_CHECKS;
  });
});
