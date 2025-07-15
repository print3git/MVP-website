const child_process = require("child_process");
const fs = require("fs");
const path = require("path");

const flag = path.join(__dirname, "..", ".setup-complete");

beforeEach(() => {
  jest.resetModules();
  jest.spyOn(child_process, "execSync").mockImplementation(() => {});
  if (fs.existsSync(flag)) fs.unlinkSync(flag);
});

afterEach(() => {
  if (fs.existsSync(flag)) fs.unlinkSync(flag);
  delete process.env.SKIP_SETUP;
});

test("skips setup when SKIP_SETUP is set", () => {
  process.env.SKIP_SETUP = "1";
  const { main } = require("../scripts/run-smoke.js");
  main();
  const calls = child_process.execSync.mock.calls.map((c) => c[0]);
  expect(calls).not.toContain("npm run setup");
});

test("skips setup when .setup-complete exists", () => {
  fs.writeFileSync(flag, "");
  const { main } = require("../scripts/run-smoke.js");
  main();
  const calls = child_process.execSync.mock.calls.map((c) => c[0]);
  expect(calls).not.toContain("npm run setup");
});
