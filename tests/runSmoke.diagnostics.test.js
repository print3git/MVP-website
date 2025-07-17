const child_process = require("child_process");

beforeEach(() => {
  jest.resetModules();
});

afterEach(() => {
  delete process.env.SKIP_SETUP;
  delete process.env.SKIP_PW_DEPS;
});

test("run-smoke logs diagnostics on failure", () => {
  const exec = jest
    .spyOn(child_process, "execSync")
    .mockImplementation((cmd) => {
      if (cmd.includes("wait-on")) {
        const err = new Error("fail");
        err.status = 1;
        throw err;
      }
    });
  const errors = [];
  const errSpy = jest
    .spyOn(console, "error")
    .mockImplementation((msg) => errors.push(msg));
  const exit = jest.spyOn(process, "exit").mockImplementation((code) => {
    throw new Error(`exit:${code}`);
  });
  process.env.SKIP_SETUP = "1";
  process.env.SKIP_PW_DEPS = "1";
  expect(() => {
    require("../scripts/run-smoke.js").main();
  }).toThrow(/exit:1/);
  exec.mockRestore();
  errSpy.mockRestore();
  exit.mockRestore();
  const output = errors.join("\n");
  expect(output).toMatch(/Environment keys:/);
  expect(output).toMatch(/Command:/);
});
