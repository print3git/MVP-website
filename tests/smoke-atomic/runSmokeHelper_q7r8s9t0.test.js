jest.mock("child_process", () => ({ execSync: jest.fn() }));
const child_process = require("child_process");
const { run } = require("../../scripts/run-smoke");

describe("run-smoke run()", () => {
  beforeEach(() => {
    child_process.execSync.mockReset();
  });

  test("executes command with inherited stdio", () => {
    run("echo test");
    expect(child_process.execSync).toHaveBeenCalledWith("echo test", {
      stdio: "inherit",
      env: expect.any(Object),
    });
  });

  test("rethrows errors", () => {
    child_process.execSync.mockImplementation(() => {
      const err = new Error("fail");
      err.status = 1;
      throw err;
    });
    expect(() => run("bad")).toThrow("fail");
  });
});
