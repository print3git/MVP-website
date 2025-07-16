let child_process;

beforeEach(() => {
  jest.resetModules();
  jest.mock("child_process");
  child_process = require("child_process");
  child_process.spawnSync.mockReset();
});

test("runs dry-run check before network check", () => {
  child_process.spawnSync
    .mockReturnValueOnce("deps ok")
    .mockReturnValueOnce("network ok");
  require("../scripts/check-host-deps.js");
  expect(child_process.spawnSync).toHaveBeenNthCalledWith(
    1,
    "npx",
    ["playwright", "install", "--with-deps", "--dry-run"],
    { encoding: "utf8" },
  );
  expect(child_process.spawnSync).toHaveBeenNthCalledWith(
    2,
    process.execPath,
    [expect.stringContaining("network-check.js")],
    { stdio: "pipe", encoding: "utf8" },
  );
});

test("exits when network check fails", () => {
  child_process.spawnSync.mockImplementationOnce(() => {
    throw new Error("net fail");
  });
  const exitSpy = jest.spyOn(process, "exit").mockImplementation(() => {
    throw new Error("exit");
  });
  exitSpy.mockClear();
  expect(() => require("../scripts/check-host-deps.js")).toThrow("exit");
  expect(exitSpy).toHaveBeenCalledWith(1);
});

test("skips network check when SKIP_NET_CHECKS is set", () => {
  process.env.SKIP_NET_CHECKS = "1";
  child_process.spawnSync.mockReturnValueOnce({ status: 0, stdout: "deps ok" });
  require("../scripts/check-host-deps.js");
  expect(child_process.spawnSync).toHaveBeenCalledTimes(1);
  expect(child_process.spawnSync).toHaveBeenCalledWith(
    "npx",
    ["playwright", "install", "--with-deps", "--dry-run"],
    { encoding: "utf8" },
  );
  delete process.env.SKIP_NET_CHECKS;
});

test("skips install when SKIP_PW_DEPS is set but missing", () => {
  process.env.SKIP_PW_DEPS = "1";
  child_process.spawnSync.mockReturnValueOnce({
    status: 0,
    stdout: "Host system is missing dependencies",
  });
  require("../scripts/check-host-deps.js");
  expect(child_process.spawnSync).toHaveBeenCalledTimes(1);
  expect(child_process.spawnSync).toHaveBeenCalledWith(
    "npx",
    ["playwright", "install", "--with-deps", "--dry-run"],
    { encoding: "utf8" },
  );
  delete process.env.SKIP_PW_DEPS;
});

test("skips install when warning printed with SKIP_PW_DEPS", () => {
  process.env.SKIP_PW_DEPS = "1";
  child_process.spawnSync.mockReturnValueOnce({
    status: 0,
    stdout:
      "Playwright Host validation warning: Host system is missing dependencies",
  });
  require("../scripts/check-host-deps.js");
  expect(child_process.spawnSync).toHaveBeenCalledTimes(1);
  expect(child_process.spawnSync).toHaveBeenCalledWith(
    "npx",
    ["playwright", "install", "--with-deps", "--dry-run"],
    { encoding: "utf8" },
  );
  delete process.env.SKIP_PW_DEPS;
});

test("skips install when deps satisfied even if SKIP_PW_DEPS is set", () => {
  process.env.SKIP_PW_DEPS = "1";
  child_process.spawnSync.mockReturnValueOnce({ status: 0, stdout: "deps ok" });
  require("../scripts/check-host-deps.js");
  expect(child_process.spawnSync).toHaveBeenCalledTimes(1);
  expect(child_process.spawnSync).toHaveBeenCalledWith(
    "npx",
    ["playwright", "install", "--with-deps", "--dry-run"],
    { encoding: "utf8" },
  );
  delete process.env.SKIP_PW_DEPS;
});

test("retries without deps when apt-get fails", () => {
  child_process.spawnSync
    .mockReturnValueOnce("network ok")
    .mockReturnValueOnce({
      status: 0,
      stdout: "Host system is missing dependencies",
    })
    .mockImplementationOnce(() => {
      const err = new Error("exit code: 100");
      throw err;
    })
    .mockReturnValueOnce({ status: 0, stdout: "" });

  expect(() => require("../scripts/check-host-deps.js")).not.toThrow();

  expect(child_process.spawnSync).toHaveBeenNthCalledWith(
    3,
    "npx",
    ["playwright", "install", "--with-deps"],
    { stdio: "inherit", env: expect.objectContaining({ CI: "1" }) },
  );
  expect(child_process.spawnSync).toHaveBeenNthCalledWith(
    4,
    "npx",
    ["playwright", "install"],
    { stdio: "inherit", env: expect.objectContaining({ CI: "1" }) },
  );
});

test("prints network check output on failure", () => {
  const err = new Error("net fail");
  err.stdout = "out";
  err.stderr = "curl: (7) bad";
  child_process.spawnSync.mockImplementationOnce(() => {
    throw err;
  });
  const outSpy = jest
    .spyOn(process.stdout, "write")
    .mockImplementation(() => {});
  const errSpy = jest
    .spyOn(process.stderr, "write")
    .mockImplementation(() => {});
  const exitSpy = jest.spyOn(process, "exit").mockImplementation(() => {
    throw new Error("exit");
  });
  expect(() => require("../scripts/check-host-deps.js")).toThrow("exit");
  expect(outSpy).toHaveBeenCalledWith("out");
  expect(errSpy).toHaveBeenCalledWith("curl: (7) bad");
  expect(exitSpy).toHaveBeenCalledWith(1);
  outSpy.mockRestore();
  errSpy.mockRestore();
  exitSpy.mockRestore();
});
