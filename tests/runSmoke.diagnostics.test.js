const child_process = require("child_process");

beforeEach(() => {
  jest.resetModules();
});

afterEach(() => {
  delete process.env.SKIP_SETUP;
});

test("run-smoke logs diagnostics on failure", () => {
  const spawn = jest
    .spyOn(child_process, "spawnSync")
    .mockImplementation((cmd) => {
      if (cmd.includes("wait-on")) {
        return { status: 1, stderr: "fail" };
      }
      return { status: 0, stdout: "", stderr: "" };
    });
  const errors = [];
  const errSpy = jest
    .spyOn(console, "error")
    .mockImplementation((msg) => errors.push(msg));
  const exit = jest.spyOn(process, "exit").mockImplementation((code) => {
    throw new Error(`exit:${code}`);
  });
  process.env.SKIP_SETUP = "1";
  expect(() => {
    require("../scripts/run-smoke.js").main();
  }).toThrow(/exit:1/);
  spawn.mockRestore();
  errSpy.mockRestore();
  exit.mockRestore();
  const output = errors.join("\n");
  expect(output).toMatch(/Environment keys:/);
  expect(output).toMatch(/Command:/);
});
