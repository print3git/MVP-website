let child_process;

beforeEach(() => {
  jest.resetModules();
  jest.doMock("child_process", () => ({ execSync: jest.fn() }));
  child_process = require("child_process");
});

afterEach(() => {
  jest.resetModules();
});

describe("check-host-deps", () => {
  test("verifies connectivity before install", () => {
    child_process.execSync.mockImplementation(() => "");
    require("../scripts/check-host-deps.js");
    expect(child_process.execSync).toHaveBeenCalledWith("npm ping", {
      stdio: "ignore",
    });
    expect(child_process.execSync).toHaveBeenCalledWith(
      "curl -sI https://cdn.playwright.dev",
      { stdio: "ignore" },
    );
  });

  test("exits when connectivity fails", () => {
    child_process.execSync.mockImplementation(() => {
      throw new Error("fail");
    });
    const exitSpy = jest.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("exit");
    });
    expect(() => require("../scripts/check-host-deps.js")).toThrow("exit");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  test("skips net checks with SKIP_NET_CHECKS", () => {
    process.env.SKIP_NET_CHECKS = "1";
    child_process.execSync.mockReturnValue("");
    require("../scripts/check-host-deps.js");
    expect(child_process.execSync).not.toHaveBeenCalledWith(
      "npm ping",
      expect.anything(),
    );
    delete process.env.SKIP_NET_CHECKS;
  });

  test("exits early when SKIP_PW_DEPS is set", () => {
    process.env.SKIP_PW_DEPS = "1";
    const exitSpy = jest.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("exit");
    });
    expect(() => require("../scripts/check-host-deps.js")).toThrow("exit");
    expect(exitSpy).toHaveBeenCalledWith(0);
    delete process.env.SKIP_PW_DEPS;
  });
});
