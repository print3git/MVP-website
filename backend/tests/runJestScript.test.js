const fs = require("fs");
const child_process = require("child_process");

jest.mock("fs");
jest.mock("child_process", () => ({
  spawnSync: jest.fn(() => ({ status: 0 })),
  execSync: jest.fn(),
}));

const runJest = require("../../scripts/run-jest");

beforeEach(() => {
  child_process.spawnSync.mockClear();
});

test("uses backend jest when installed", () => {
  fs.existsSync.mockReturnValue(true);
  runJest(["--version"]);
  expect(child_process.spawnSync).toHaveBeenCalledWith(
    expect.stringContaining("backend/node_modules/.bin/jest"),
    expect.any(Array),
    expect.objectContaining({ stdio: "inherit" }),
  );
});

test("falls back to npm test when jest missing", () => {
  fs.existsSync.mockReturnValue(false);
  runJest(["--help"]);
  expect(child_process.spawnSync).toHaveBeenCalledWith(
    "npm",
    expect.arrayContaining(["test", "--prefix", "backend"]),
    expect.objectContaining({ stdio: "inherit" }),
  );
});
