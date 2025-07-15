let fs;
let child_process;

jest.mock("fs");

describe("ensure-deps", () => {
  beforeEach(() => {
    jest.resetModules();
    fs = require("fs");
    child_process = require("child_process");
    fs.existsSync.mockReset();
    jest.spyOn(child_process, "execSync").mockReset();
    delete process.env.SKIP_NET_CHECKS;
    process.env.SKIP_NODE_CHECK = "1";
  });

  test("checks network then installs", () => {
    fs.existsSync.mockReturnValue(false);
    const execMock = jest
      .spyOn(child_process, "execSync")
      .mockImplementation(() => {});
    require("../backend/scripts/ensure-deps");
    expect(execMock).toHaveBeenCalledWith(
      expect.stringContaining("network-check.js"),
      expect.any(Object),
    );
    expect(execMock).toHaveBeenCalledWith("npm ping", expect.any(Object));
    expect(execMock).toHaveBeenCalledWith(
      expect.stringContaining("check-apt.js"),
      expect.any(Object),
    );
    expect(execMock).toHaveBeenCalledWith(
      "npm run setup",
      expect.objectContaining({ cwd: expect.any(String) }),
    );
  });

  test("runs setup when flag missing", () => {
    fs.existsSync.mockReturnValue(false);
    const execMock = jest
      .spyOn(child_process, "execSync")
      .mockImplementation(() => {});
    require("../backend/scripts/ensure-deps");
    expect(execMock).toHaveBeenCalledWith(
      expect.stringContaining("check-apt.js"),
      expect.any(Object),
    );
    expect(execMock).toHaveBeenCalledWith(
      "npm run setup",
      expect.objectContaining({ cwd: expect.any(String) }),
    );
  });

  test("exits when npm ping fails", () => {
    fs.existsSync.mockReturnValue(false);
    jest.spyOn(child_process, "execSync").mockImplementation(() => {
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
    jest.spyOn(child_process, "execSync").mockImplementation((cmd, opts) => {
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

  test("falls back to SKIP_PW_DEPS when apt check fails", () => {
    fs.existsSync.mockReturnValue(false);
    const execMock = jest
      .spyOn(child_process, "execSync")
      .mockImplementation((cmd) => {
        if (cmd.includes("check-apt.js")) {
          throw new Error("apt fail");
        }
      });
    require("../backend/scripts/ensure-deps");
    expect(execMock).toHaveBeenCalledWith(
      expect.stringContaining("check-apt.js"),
      expect.any(Object),
    );
    expect(execMock).toHaveBeenCalledWith(
      "npm run setup",
      expect.objectContaining({
        cwd: expect.any(String),
        env: expect.objectContaining({ SKIP_PW_DEPS: "1" }),
      }),
    );
  });

  test("retries without SKIP_PW_DEPS when setup fails", () => {
    process.env.SKIP_PW_DEPS = "1";
    fs.existsSync.mockReturnValue(false);
    const calls = [];
    const execMock = jest
      .spyOn(child_process, "execSync")
      .mockImplementation((cmd, opts) => {
        calls.push({ cmd, env: { ...(opts.env || {}) } });
        if (cmd === "npm run setup" && opts.env.SKIP_PW_DEPS) {
          throw new Error("setup fail");
        }
      });

    require("../backend/scripts/ensure-deps");

    const setupCalls = calls.filter((c) => c.cmd === "npm run setup");
    expect(setupCalls.length).toBe(2);
    expect(setupCalls[0].env.SKIP_PW_DEPS).toBe("1");
    expect(setupCalls[1].env).not.toHaveProperty("SKIP_PW_DEPS");

    expect(execMock).toHaveBeenCalled();

    delete process.env.SKIP_PW_DEPS;
    execMock.mockRestore();
  });

  test("retries network check with SKIP_PW_DEPS when it fails", () => {
    fs.existsSync.mockReturnValue(false);
    let first = true;
    const execMock = jest
      .spyOn(child_process, "execSync")
      .mockImplementation((cmd, opts) => {
        if (cmd.includes("network-check.js")) {
          if (first) {
            first = false;
            throw new Error("net fail");
          }
          expect(opts.env.SKIP_PW_DEPS).toBe("1");
        }
      });

    require("../backend/scripts/ensure-deps");

    const netCalls = execMock.mock.calls.filter(([c]) =>
      c.includes("network-check.js"),
    );
    expect(netCalls.length).toBe(2);

    execMock.mockRestore();
  });
});
