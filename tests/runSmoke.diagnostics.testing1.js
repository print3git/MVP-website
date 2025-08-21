const child_process = require("child_process");

beforeEach(() => {
  jest.resetModules();
});

afterEach(() => {
  delete process.env.SKIP_SETUP;
});

test("run-smoke reports diagnostics on failure", () => {
  const spawn = jest
    .spyOn(child_process, "spawnSync")
    .mockImplementation((cmd) => {
      if (cmd.includes("concurrently")) {
        return { status: 1, stderr: "fail" };
      }
      return { status: 0, stdout: "", stderr: "" };
    });
  const errorMock = jest.spyOn(console, "error").mockImplementation(() => {});
  const exitMock = jest.spyOn(process, "exit").mockImplementation(() => {});
  process.env.SKIP_SETUP = "1";
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
  spawn.mockRestore();
  errorMock.mockRestore();
  exitMock.mockRestore();
});
