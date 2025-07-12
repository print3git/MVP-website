let fs;
let child_process;

jest.mock("fs");
jest.mock("child_process");

describe("ensure-deps", () => {
  beforeEach(() => {
    jest.resetModules();
    fs = require("fs");
    child_process = require("child_process");
    fs.existsSync.mockReset();
    child_process.execSync.mockReset();
  });
  test("checks network then installs", () => {
    fs.existsSync.mockReturnValue(false);
    const execMock = jest.fn();
    child_process.execSync.mockImplementation(execMock);
    require("../backend/scripts/ensure-deps");
    expect(execMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("network-check.js"),
      expect.any(Object),
    );
    expect(execMock).toHaveBeenNthCalledWith(2, "npm ping", {
      stdio: "ignore",
    });
    expect(execMock).toHaveBeenNthCalledWith(3, "npm ci", {
      stdio: "inherit",
      cwd: expect.any(String),
    });
    expect(execMock).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining("network-check.js"),
      expect.any(Object),
    );
    expect(execMock).toHaveBeenNthCalledWith(5, "npm ping", {
      stdio: "ignore",
    });
    expect(execMock).toHaveBeenNthCalledWith(7, "npm ci", { stdio: "inherit" });
  });

  test("exits when npm ping fails", () => {
    fs.existsSync.mockReturnValue(false);
    child_process.execSync.mockImplementation(() => {
      throw new Error("ping fail");
    });
    const exitSpy = jest.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("exit");
    });
    expect(() => require("../backend/scripts/ensure-deps")).toThrow("exit");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  test("exits when npm ci fails", () => {
    fs.existsSync.mockReturnValue(false);
    child_process.execSync.mockImplementation((cmd, opts) => {
      if (cmd === "npm ci" && !opts.cwd) {
        throw new Error("ci fail");
      }
    });
    const exitSpy = jest.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("exit");
    });
    expect(() => require("../backend/scripts/ensure-deps")).toThrow("exit");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
