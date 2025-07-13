jest.mock("../scripts/assert-setup.js");
jest.mock("../scripts/ensure-root-deps.js");
const child_process = require("child_process");
const fs = require("fs");

describe("run-jest setup", () => {
  beforeEach(() => {
    jest.resetModules();
    child_process.execSync = jest.fn();
    fs.existsSync = jest.fn().mockReturnValue(true);
  });

  test("invokes assert-setup before running", () => {
    const runJest = require("../scripts/run-jest");
    runJest(["tests/validateEnv.test.js"]);
    expect(require("../scripts/assert-setup.js")).toHaveBeenCalled();
  });
});
