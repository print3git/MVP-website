let child_process;

beforeEach(() => {
  jest.resetModules();
  jest.mock("child_process");
  child_process = require("child_process");
  child_process.execSync.mockReset();
});

test("runs network check before installing", () => {
  child_process.execSync
    .mockReturnValueOnce("network ok")
    .mockReturnValueOnce("deps ok");
  require("../scripts/check-host-deps.js");
  expect(child_process.execSync).toHaveBeenNthCalledWith(
    1,
    expect.stringContaining("network-check.js"),
    { stdio: "ignore" },
  );
  expect(child_process.execSync).toHaveBeenNthCalledWith(
    2,
    "npx playwright install --with-deps --dry-run 2>&1",
    { encoding: "utf8" },
  );
});

test("exits when network check fails", () => {
  child_process.execSync.mockImplementationOnce(() => {
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
  child_process.execSync.mockReturnValueOnce("deps ok");
  require("../scripts/check-host-deps.js");
  expect(child_process.execSync).toHaveBeenCalledTimes(1);
  expect(child_process.execSync).toHaveBeenCalledWith(
    "npx playwright install --with-deps --dry-run 2>&1",
    { encoding: "utf8" },
  );
  delete process.env.SKIP_NET_CHECKS;
});

test("fails when SKIP_PW_DEPS is set and deps are missing", () => {
  process.env.SKIP_PW_DEPS = "1";
  child_process.execSync
    .mockReturnValueOnce("network ok")
    .mockReturnValueOnce("Host system is missing dependencies")
    .mockReturnValueOnce("");
  const exitSpy = jest.spyOn(process, "exit").mockImplementation(() => {
    throw new Error("exit");
  });
  expect(() => require("../scripts/check-host-deps.js")).toThrow("exit");
  expect(exitSpy).toHaveBeenCalledWith(1);
  expect(child_process.execSync).toHaveBeenNthCalledWith(
    1,
    expect.stringContaining("network-check.js"),
    { stdio: "ignore" },
  );
  expect(child_process.execSync).toHaveBeenNthCalledWith(
    2,
    "npx playwright install --with-deps --dry-run 2>&1",
    { encoding: "utf8" },
  );
  expect(child_process.execSync).toHaveBeenCalledTimes(2);

  expect(exitSpy).toHaveBeenCalledWith(1);
  delete process.env.SKIP_PW_DEPS;
});

test("fails when SKIP_PW_DEPS is set and warning is printed", () => {
  process.env.SKIP_PW_DEPS = "1";
  child_process.execSync
    .mockReturnValueOnce("network ok")
    .mockReturnValueOnce(
      "Playwright Host validation warning: Host system is missing dependencies",
    )
    .mockReturnValueOnce("");
  const exitSpy = jest.spyOn(process, "exit").mockImplementation(() => {
    throw new Error("exit");
  });
  expect(() => require("../scripts/check-host-deps.js")).toThrow("exit");
  expect(child_process.execSync).toHaveBeenNthCalledWith(
    1,
    expect.stringContaining("network-check.js"),
    { stdio: "ignore" },
  );
  expect(child_process.execSync).toHaveBeenNthCalledWith(
    2,
    "npx playwright install --with-deps --dry-run 2>&1",
    { encoding: "utf8" },
  );
  expect(child_process.execSync).toHaveBeenCalledTimes(2);
  expect(exitSpy).toHaveBeenCalledWith(1);
  delete process.env.SKIP_PW_DEPS;
});

test("skips install when deps satisfied even if SKIP_PW_DEPS is set", () => {
  process.env.SKIP_PW_DEPS = "1";
  child_process.execSync
    .mockReturnValueOnce("network ok")
    .mockReturnValueOnce("deps ok");
  require("../scripts/check-host-deps.js");
  expect(child_process.execSync).toHaveBeenNthCalledWith(
    1,
    expect.stringContaining("network-check.js"),
    { stdio: "ignore" },
  );
  expect(child_process.execSync).toHaveBeenNthCalledWith(
    2,
    "npx playwright install --with-deps --dry-run 2>&1",
    { encoding: "utf8" },
  );
  expect(child_process.execSync).toHaveBeenCalledTimes(2);
  delete process.env.SKIP_PW_DEPS;
});

test("retries without deps when apt-get fails", () => {
  child_process.execSync
    .mockReturnValueOnce("network ok")
    .mockReturnValueOnce("Host system is missing dependencies")
    .mockImplementationOnce(() => {
      const err = new Error("exit code: 100");
      throw err;
    })
    .mockReturnValueOnce("");

  expect(() => require("../scripts/check-host-deps.js")).not.toThrow();

  expect(child_process.execSync).toHaveBeenNthCalledWith(
    3,
    "CI=1 npx playwright install --with-deps",
    { stdio: "inherit" },
  );
  expect(child_process.execSync).toHaveBeenNthCalledWith(
    4,
    "CI=1 npx playwright install",
    { stdio: "inherit" },
  );
});
