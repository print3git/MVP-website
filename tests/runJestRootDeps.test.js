const fs = require("fs");
const child_process = require("child_process");

jest.mock("fs");
jest.mock("../scripts/ensure-root-deps.js", () => ({}));

beforeEach(() => {
  jest.resetModules();
  fs.existsSync.mockReset();
  child_process.execSync = jest.fn();
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  delete process.env.SKIP_ROOT_DEPS_CHECK;
  console.warn.mockRestore();
});

test("run-jest invokes ensure-root-deps when SKIP_ROOT_DEPS_CHECK=1 but deps missing", () => {
  process.env.SKIP_ROOT_DEPS_CHECK = "1";
  fs.existsSync.mockImplementation((p) => {
    if (p.includes("@babel/plugin-syntax-typescript")) return false;
    if (p.includes("backend/node_modules/.bin/jest")) return true;
    return true;
  });

  const runJest = require("../scripts/run-jest.js");
  runJest(["tests/validateEnv.test.js"]);

  expect(console.warn).toHaveBeenCalledWith(
    "Root dependencies missing. Running ensure-root-deps...",
  );
  expect(child_process.execSync).toHaveBeenCalled();
});
