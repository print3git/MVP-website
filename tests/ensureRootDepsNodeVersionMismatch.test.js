const fs = require("fs");
const child_process = require("child_process");

jest.mock("fs");
jest.mock("child_process");

describe("ensure-root-deps node version mismatch", () => {
  beforeEach(() => {
    fs.existsSync.mockReturnValue(true);
    child_process.execSync.mockReset();
    process.exit = jest.fn();
  });

  test("fails when node version differs from required", () => {
    const originalVersions = process.versions;
    Object.defineProperty(process, "versions", {
      value: { ...process.versions, node: "25.0.0" },
    });
    jest.isolateModules(() => {
      require("../scripts/ensure-root-deps.js");
    });
    expect(process.exit).toHaveBeenCalledWith(1);
    Object.defineProperty(process, "versions", { value: originalVersions });
  });
});
