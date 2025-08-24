const child_process = require("child_process");

jest.mock("child_process");

const { main } = require("../../scripts/run-smoke");

describe("run-smoke failure handling", () => {
  beforeEach(() => {
    child_process.spawnSync.mockReset();
  });

  test("exits with message when setup fails", () => {
    child_process.spawnSync.mockImplementation(() => ({ status: 1 }));
    const exitSpy = jest.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("exit");
    });
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => main()).toThrow("exit");
    expect(errSpy.mock.calls[0][0]).toMatch(/Smoke test failed/);
    expect(exitSpy).toHaveBeenCalledWith(1);
    errSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
