const child_process = require("child_process");

beforeEach(() => {
  jest.resetModules();
  jest.spyOn(child_process, "execSync").mockImplementation(() => {});
});

test("run-smoke does not invoke setup", () => {
  process.env.SKIP_PW_DEPS = "1";
  const { main } = require("../scripts/run-smoke.js");
  main();
  const commands = child_process.execSync.mock.calls.map((c) => c[0]);
  expect(commands).not.toContain("npm run setup");
});
