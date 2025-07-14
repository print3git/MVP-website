const fs = require("fs");
const child_process = require("child_process");

jest.mock("fs");

describe("ensure-deps host deps check", () => {
  beforeEach(() => {
    jest.resetModules();
    fs.existsSync.mockReturnValue(true);
    jest.spyOn(child_process, "execSync").mockImplementation(() => {});
    process.env.SKIP_NODE_CHECK = "1";
  });

  test("invokes host dependency check", () => {
    require("../backend/scripts/ensure-deps");
    expect(child_process.execSync).toHaveBeenCalledWith(
      expect.stringContaining("check-host-deps.js"),
      expect.any(Object),
    );
  });
});
