const child_process = require("child_process");

beforeEach(() => {
  jest.resetModules();
  jest.spyOn(child_process, "execSync").mockImplementation(() => {});
});

afterEach(() => {
  delete process.env.SKIP_SETUP;
  delete process.env.SKIP_PW_DEPS;
});

test("run-smoke frees port before starting server", () => {
  process.env.SKIP_SETUP = "1";
  process.env.SKIP_PW_DEPS = "1";
  const { main } = require("../scripts/run-smoke.js");
  main();
  const commands = child_process.execSync.mock.calls.map((c) => c[0]);
  expect(commands).toContain("npx -y kill-port 3000");
});
