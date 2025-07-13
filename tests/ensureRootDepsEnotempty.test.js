const fs = require("fs");
const child_process = require("child_process");

jest.mock("fs");
jest.mock("child_process");

describe("ensure-root-deps ENOTEMPTY recovery", () => {
  beforeEach(() => {
    fs.existsSync.mockReset();
    child_process.execSync.mockReset();
    process.exit = jest.fn();
  });

  test("cleans node_modules and retries on ENOTEMPTY", () => {
    fs.existsSync.mockReturnValue(false);
    child_process.execSync
      .mockImplementationOnce(() => {}) // network check
      .mockImplementationOnce(() => {}) // npm ping
      .mockImplementationOnce(() => {
        throw new Error("ENOTEMPTY: rmdir");
      })
      .mockImplementation(() => {});

    jest.isolateModules(() => {
      require("../scripts/ensure-root-deps.js");
    });

    const ciCalls = child_process.execSync.mock.calls.filter(
      (c) => c[0] === "npm ci",
    );
    expect(ciCalls.length).toBeGreaterThan(1);
    expect(process.exit).not.toHaveBeenCalled();
  });
});
