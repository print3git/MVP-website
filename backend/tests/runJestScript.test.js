const fs = require("fs");
const child_process = require("child_process");

jest.mock("fs");
jest.mock("child_process");

const runJest = require("../../scripts/run-jest");

beforeEach(() => {
  child_process.execSync.mockReset();
});

test("uses backend jest when installed", () => {
  fs.existsSync.mockReturnValue(true);
  runJest(["--version"]);
  expect(child_process.execSync).toHaveBeenCalledWith(
    expect.stringContaining("backend/node_modules/.bin/jest"),
    expect.objectContaining({ stdio: "inherit" }),
  );
});

test("falls back to npm test when jest missing", () => {
  fs.existsSync.mockReturnValue(false);
  runJest(["--help"]);
  expect(child_process.execSync).toHaveBeenCalledWith(
    expect.stringContaining("npm test --prefix backend"),
    expect.objectContaining({ stdio: "inherit" }),
  );
});
