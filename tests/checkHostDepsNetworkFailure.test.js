const child_process = require("child_process");

beforeEach(() => {
  jest.resetModules();
  jest.mock("child_process");
  child_process.execSync.mockReset();
});

test("skips install when network check fails and SKIP_PW_DEPS=1", () => {
  const err = new Error("net fail");
  err.stdout = "";
  err.stderr = "Unable to reach Playwright CDN";
  child_process.execSync.mockImplementationOnce(() => {
    throw err;
  });
  process.env.SKIP_PW_DEPS = "1";
  expect(() => require("../scripts/check-host-deps.js")).not.toThrow();
  expect(child_process.execSync).toHaveBeenCalledTimes(1);
  delete process.env.SKIP_PW_DEPS;
});
