jest.mock("child_process", () => ({ execSync: jest.fn() }));
jest.mock("fs", () => ({ rmSync: jest.fn() }));
const { execSync } = require("child_process");
const { rmSync } = require("fs");

describe("runNpmCi", () => {
  beforeEach(() => {
    execSync.mockReset();
    rmSync.mockReset();
  });

  test("retries with npm install on EUSAGE", () => {
    execSync.mockImplementationOnce(() => {
      const err = new Error("EUSAGE");
      err.stderr = "npm ERR! EUSAGE";
      throw err;
    });
    const { runNpmCi } = require("../scripts/run-npm-ci");
    runNpmCi();
    expect(execSync.mock.calls.map((c) => c[0])).toEqual([
      "npm ci --no-audit --no-fund",
      "npm install --no-audit --no-fund",
      "npm ci --no-audit --no-fund",
    ]);
  });

  test("cleans cache on tar errors", () => {
    execSync.mockImplementationOnce(() => {
      const err = new Error("tar");
      err.stderr = "TAR_ENTRY_ERROR";
      throw err;
    });
    const { runNpmCi } = require("../scripts/run-npm-ci");
    runNpmCi("backend");
    expect(execSync.mock.calls[0][0]).toBe("npm ci --no-audit --no-fund");
    expect(rmSync).toHaveBeenCalledWith(
      expect.stringContaining("backend/node_modules"),
      expect.any(Object),
    );
    expect(execSync.mock.calls.pop()[0]).toBe("npm ci --no-audit --no-fund");
  });
});
