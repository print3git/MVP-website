const fs = require("fs");
const child_process = require("child_process");

jest.mock("fs");
jest.mock("child_process");

describe("ensure-deps", () => {
  beforeEach(() => {
    jest.resetModules();
    fs.existsSync.mockReset();
    child_process.execSync.mockReset();
  });
  test("pings npm registry before installing", () => {
    fs.existsSync.mockReturnValue(false);
    const execMock = jest.fn();
    child_process.execSync.mockImplementation(execMock);
    require("../backend/scripts/ensure-deps");
    expect(execMock).toHaveBeenCalledWith("npm ping", { stdio: "ignore" });
    expect(execMock).toHaveBeenCalledWith("npm ci", { stdio: "inherit" });
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
    child_process.execSync
      .mockImplementationOnce(() => {})
      .mockImplementationOnce(() => {
        throw new Error("ci fail");
      });
    const exitSpy = jest.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("exit");
    });
    expect(() => require("../backend/scripts/ensure-deps")).toThrow("exit");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
