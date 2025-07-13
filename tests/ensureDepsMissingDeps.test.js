const fs = require("fs");
const child_process = require("child_process");

jest.mock("fs");

describe("ensure-deps missing dependency handling", () => {
  beforeEach(() => {
    jest.resetModules();
    fs.existsSync.mockReset();
    jest.spyOn(child_process, "execSync").mockImplementation(() => {});
    delete process.env.SKIP_NET_CHECKS;
    process.env.SKIP_NODE_CHECK = "1";
  });

  function run() {
    require("../backend/scripts/ensure-deps");
  }

  test("installs root deps when express missing", () => {
    fs.existsSync.mockImplementation((p) =>
      p.includes("express") ? false : true,
    );
    run();
    expect(child_process.execSync).toHaveBeenCalledWith("npm ci", {
      stdio: "inherit",
      cwd: expect.any(String),
    });
  });

  test("installs root deps when @playwright/test missing", () => {
    fs.existsSync.mockImplementation((p) =>
      p.includes("@playwright") ? false : true,
    );
    run();
    expect(child_process.execSync).toHaveBeenCalledWith("npm ci", {
      stdio: "inherit",
      cwd: expect.any(String),
    });
  });

  test("installs backend deps when jest missing", () => {
    fs.existsSync.mockImplementation((p) =>
      p.endsWith(".bin/jest") ? false : true,
    );
    run();
    expect(child_process.execSync).toHaveBeenCalledWith("npm ci", {
      stdio: "inherit",
    });
  });
});
