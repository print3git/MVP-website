const child_process = require("child_process");

beforeEach(() => {
  jest.resetModules();
  jest.spyOn(child_process, "execSync").mockImplementation(() => {});
});

afterEach(() => {
  delete process.env.SKIP_PW_DEPS;
});

test("passes SKIP_PW_DEPS to setup", () => {
  process.env.SKIP_PW_DEPS = "1";
  const { main } = require("../scripts/run-smoke.js");
  main();
  const call = child_process.execSync.mock.calls.find(
    (c) => c[0] === "npm run setup",
  );
  expect(call[1].env.SKIP_PW_DEPS).toBe("1");
});
