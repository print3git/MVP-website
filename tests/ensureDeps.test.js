const fs = require("fs");
const child_process = require("child_process");

jest.mock("fs");
jest.mock("child_process");

describe("ensure-deps", () => {
  test("pings npm registry before installing", () => {
    fs.existsSync.mockReturnValue(false);
    const execMock = jest.fn();
    child_process.execSync.mockImplementation(execMock);
    require("../backend/scripts/ensure-deps");
    expect(execMock).toHaveBeenCalledWith("npm ping", { stdio: "ignore" });
    expect(execMock).toHaveBeenCalledWith("npm ci", { stdio: "inherit" });
  });
});
