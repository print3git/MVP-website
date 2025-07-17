const child_process = require("child_process");

beforeEach(() => {
  jest.resetModules();
});

afterEach(() => {
  delete process.env.SKIP_SETUP;
  delete process.env.SKIP_PW_DEPS;
});

test("run-smoke reports diagnostics on failure", () => {
  const exec = jest
    .spyOn(child_process, "execSync")
    .mockImplementation((cmd) => {
      if (cmd.includes("playwright test")) {
        const err = new Error("fail");
        err.status = 1;
        throw err;
      }
    });
  const errorMock = jest.spyOn(console, "error").mockImplementation(() => {});
  const exitMock = jest.spyOn(process, "exit").mockImplementation(() => {});
  process.env.SKIP_SETUP = "1";
  process.env.SKIP_PW_DEPS = "1";
  const { main } = require("../scripts/run-smoke.js");
  main();
  expect(
    errorMock.mock.calls.some((c) => /Smoke test failed:/.test(c[0])),
  ).toBe(true);
  expect(errorMock.mock.calls.some((c) => /Environment keys:/.test(c[0]))).toBe(
    true,
  );
  expect(errorMock.mock.calls.some((c) => /Command:/.test(c[0]))).toBe(true);
  expect(exitMock).toHaveBeenCalledWith(1);
  exec.mockRestore();
  errorMock.mockRestore();
  exitMock.mockRestore();
});
