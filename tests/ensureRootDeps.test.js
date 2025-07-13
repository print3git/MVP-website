const fs = require("fs");
const child_process = require("child_process");

jest.mock("fs");

describe("ensure-root-deps", () => {
  beforeEach(() => {
    fs.existsSync.mockReset();
    jest.restoreAllMocks();
    jest.spyOn(child_process, "execSync").mockImplementation(() => {});
    jest.resetModules();
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
      .mockImplementationOnce(() => {})
      .mockImplementationOnce(() => {})
      .mockImplementationOnce(() => {
        throw new Error("ECONNRESET");
      })
      .mockImplementation(() => {});
    require("../scripts/ensure-root-deps.js");
    const ciCalls = child_process.execSync.mock.calls.filter(
      (c) => c[0] === "npm ci",
    );
    expect(ciCalls.length).toBeGreaterThan(1);
  });
});
