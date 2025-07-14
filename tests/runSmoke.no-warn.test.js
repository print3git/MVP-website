/** Verify initEnv does not warn when env vars are loaded from .env.example */
test("run-smoke loads env without warnings", () => {
  let loadedEnv;
  jest.isolateModules(() => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    delete require.cache[require.resolve("../scripts/run-smoke.js")];
    ({ env: loadedEnv } = require("../scripts/run-smoke.js"));
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
  expect(loadedEnv.STRIPE_TEST_KEY).toBeDefined();
});
