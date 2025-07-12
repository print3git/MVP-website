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
      .mockImplementationOnce(() => {
        throw new Error("ECONNRESET");
      })
      .mockImplementation(() => {});
    require("../scripts/ensure-root-deps.js");
    expect(child_process.execSync.mock.calls.length).toBeGreaterThanOrEqual(5);
  });
});
