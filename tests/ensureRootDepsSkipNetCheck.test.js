const fs = require("fs");
const child_process = require("child_process");

jest.mock("fs");
jest.mock("child_process");

describe("ensure-root-deps SKIP_NET_CHECKS", () => {
  beforeEach(() => {
    fs.existsSync.mockReset();
    child_process.execSync.mockReset();
  });

  test("skips network check when env var set", () => {
    fs.existsSync.mockReturnValue(false);
    child_process.execSync.mockImplementation(() => {});
    process.env.SKIP_NET_CHECKS = "1";
    require("../scripts/ensure-root-deps.js");
    const calls = child_process.execSync.mock.calls.map((c) => c[0]);
    expect(calls.some((c) => c.includes("network-check.js"))).toBe(false);
    delete process.env.SKIP_NET_CHECKS;
  });
});
