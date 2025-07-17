const child_process = require("child_process");

beforeEach(() => {
  jest.resetModules();
  jest.restoreAllMocks();
});

test("run executes command with env", () => {
  const spy = jest
    .spyOn(child_process, "execSync")
    .mockReturnValue(Buffer.from(""));
  const { run } = require("../../scripts/run-smoke.js");
  run("echo hi");
  expect(spy).toHaveBeenCalledWith("echo hi", {
    stdio: "inherit",
    env: expect.any(Object),
  });
});

test("run throws on failure", () => {
  const err = new Error("fail");
  err.status = 1;
  jest.spyOn(child_process, "execSync").mockImplementation(() => {
    throw err;
  });
  const { run } = require("../../scripts/run-smoke.js");
  expect(() => run("bad")).toThrow(err);
});
