const fs = require("fs");
const child_process = require("child_process");

jest.mock("fs");

describe("ensure-deps node version check", () => {
  beforeEach(() => {
    jest.resetModules();
    fs.existsSync.mockReset();
    jest.spyOn(child_process, "execSync").mockReset();
  });

  test("runs check-node-version first", () => {
    fs.existsSync.mockReturnValue(true);
    const execMock = jest
      .spyOn(child_process, "execSync")
      .mockImplementation(() => {});
    require("../backend/scripts/ensure-deps");
    expect(execMock).toHaveBeenCalledWith(
      expect.stringContaining("check-node-version.js"),
      expect.any(Object),
    );
  });
});
