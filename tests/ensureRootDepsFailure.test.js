const fs = require("fs");
const child_process = require("child_process");

jest.mock("fs");
jest.mock("child_process");

describe("ensure-root-deps failure", () => {
  beforeEach(() => {
    fs.existsSync.mockReset();
    child_process.execSync.mockReset();
    process.exit = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  });

  test("exits after repeated install failures", () => {
    fs.existsSync.mockReturnValue(false);
    child_process.execSync.mockImplementation(() => {
      const err = new Error("network error");
      throw err;
    });
    jest.isolateModules(() => {
      require("../scripts/ensure-root-deps.js");
    });
    expect(child_process.execSync).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      "Failed to install dependencies after multiple attempts.",
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
