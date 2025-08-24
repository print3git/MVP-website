const child_process = require("child_process");

jest.mock("child_process");

const { main } = require("../../scripts/run-smoke");

/** Simulate failure when the smoke script runs the wait-on step. */
test("run-smoke reports diagnostics when wait-on fails", () => {
  child_process.spawnSync.mockImplementation((cmd) => {
    if (cmd.includes("wait-on")) {
      return { status: 1, stderr: "wait-on failed" };
    }
    return { status: 0 };
  });
  const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  const exitSpy = jest.spyOn(process, "exit").mockImplementation(() => {
    throw new Error("exit");
  });
  expect(() => main()).toThrow("exit");
  const messages = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
  expect(messages).toMatch(/Smoke test failed/);
  expect(messages).toMatch(/wait-on/);
  expect(exitSpy).toHaveBeenCalledWith(1);
  errSpy.mockRestore();
  exitSpy.mockRestore();
});
