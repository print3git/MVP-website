const fs = require("fs");
const child_process = require("child_process");
const path = require("path");

jest.mock("fs");
jest.mock("child_process");

describe("ensure-root-deps winston", () => {
  beforeEach(() => {
    jest.resetModules();
    fs.existsSync.mockReturnValue(true);
    child_process.execSync.mockReset();
    process.exit = jest.fn();
  });

  test("checks for winston package", () => {
    const calls = [];
    fs.existsSync.mockImplementation((p) => {
      calls.push(p);
      return true;
    });
    require("../scripts/ensure-root-deps.js");
    const winstonPath = path.join(
      __dirname,
      "..",
      "node_modules",
      "winston",
      "package.json",
    );
    expect(calls).toContain(winstonPath);
  });
});
