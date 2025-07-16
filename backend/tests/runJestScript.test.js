const fs = require("fs");
const child_process = require("child_process");

jest.mock("fs");
jest.mock("child_process");

process.env.SKIP_ROOT_DEPS_CHECK = "1";
const runJest = require("../../scripts/run-jest");

afterAll(() => {
  delete process.env.SKIP_ROOT_DEPS_CHECK;
});

beforeEach(() => {
  child_process.execSync.mockReset();
  child_process.spawnSync.mockReset();
  child_process.spawnSync.mockReturnValue({ status: 0 });
});

test("uses backend jest when installed", () => {
  fs.existsSync.mockReturnValue(true);
  runJest(["--version"]);
  expect(child_process.spawnSync).toHaveBeenCalledWith(
    expect.stringContaining("backend/node_modules/.bin/jest"),
    expect.any(Array),
    expect.objectContaining({ cwd: expect.stringContaining("backend") }),
  );
});

test("falls back to npm test when jest missing", () => {
  fs.existsSync.mockReturnValue(false);
  runJest(["--help"]);
  expect(child_process.spawnSync).toHaveBeenCalledWith(
    "npm",
    expect.arrayContaining(["test", "--prefix", "backend"]),
    expect.objectContaining({ cwd: expect.stringContaining("backend") }),
  );
});
