const child_process = require("child_process");

jest.mock("child_process");
const { main } = require("../../scripts/run-smoke");

/** Simulate failure when validate-env script fails. */
test("run-smoke reports diagnostics when validate-env fails", () => {
  child_process.spawnSync.mockImplementation((cmd) => {
    if (cmd.includes("validate-env")) {
      return { status: 1, stderr: "validate-env failed" };
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
  expect(messages).toMatch(/validate-env/);
  expect(exitSpy).toHaveBeenCalledWith(1);
  errSpy.mockRestore();
  exitSpy.mockRestore();
});
