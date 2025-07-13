const fs = require("fs");
const child_process = require("child_process");

describe("ensure-root-deps SKIP_NET_CHECKS", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.spyOn(child_process, "execSync").mockImplementation(() => {});
    jest.spyOn(fs, "existsSync").mockReturnValue(false);
  });

  test("skips network check when SKIP_NET_CHECKS is set", () => {
    process.env.SKIP_NET_CHECKS = "1";
    require("../scripts/ensure-root-deps.js");
    expect(child_process.execSync).not.toHaveBeenCalledWith(
      expect.stringContaining("network-check.js"),
      expect.any(Object),
    );
    delete process.env.SKIP_NET_CHECKS;
  });
});
