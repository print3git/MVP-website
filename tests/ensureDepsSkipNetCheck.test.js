const fs = require("fs");
const child_process = require("child_process");

describe("ensure-deps SKIP_NET_CHECKS", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.spyOn(child_process, "execSync").mockImplementation(() => {});
    jest.spyOn(fs, "existsSync").mockReturnValue(false);
    process.env.SKIP_NODE_CHECK = "1";
  });

  test("skips network check when SKIP_NET_CHECKS is set", () => {
    process.env.SKIP_NET_CHECKS = "1";
    require("../backend/scripts/ensure-deps");
    expect(child_process.execSync).not.toHaveBeenCalledWith(
      expect.stringContaining("network-check.js"),
      expect.any(Object),
    );
    const call = child_process.execSync.mock.calls.find((c) =>
      String(c[0]).includes("npm run setup"),
    );
    expect(call).toBeDefined();
    const env = call[1].env;
    expect(env.SKIP_PW_DEPS).toBe("1");
    expect(env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD).toBe("1");
    delete process.env.SKIP_NET_CHECKS;
  });
});
