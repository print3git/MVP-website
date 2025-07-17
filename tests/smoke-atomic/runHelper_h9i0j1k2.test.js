const child_process = require("child_process");

test("run helper invokes execSync and propagates errors", () => {
  jest.spyOn(child_process, "execSync").mockImplementation((cmd) => {
    if (cmd === "fail") {
      const err = new Error("boom");
      err.status = 1;
      throw err;
    }
  });
  jest.isolateModules(() => {
    const { run } = require("../../scripts/run-smoke.js");
    run("ok");
    expect(child_process.execSync).toHaveBeenCalledWith("ok", {
      stdio: "inherit",
      env: expect.any(Object),
    });
    expect(() => run("fail")).toThrow("boom");
  });
});
