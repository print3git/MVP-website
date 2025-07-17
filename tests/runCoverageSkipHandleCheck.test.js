const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const repoRoot = path.join(__dirname, "..");

describe("run-coverage SKIP_HANDLE_CHECK", () => {
  afterEach(() => {
    fs.rmSync(path.join(repoRoot, "coverage"), {
      recursive: true,
      force: true,
    });
    fs.rmSync(path.join(repoRoot, "backend", "coverage"), {
      recursive: true,
      force: true,
    });
  });

  test("fails on lingering handles", () => {
    const env = {
      ...process.env,
      SKIP_NET_CHECKS: "1",
      SKIP_DB_CHECK: "1",
      SKIP_PW_DEPS: "1",
    };
    let failed = false;
    try {
      execFileSync(
        "node",
        ["scripts/run-coverage.js", "backend/tests/openHandle.fail.js"],
        { env, encoding: "utf8", stdio: "pipe" },
      );
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
  });

  test("succeeds when SKIP_HANDLE_CHECK=1", () => {
    const env = {
      ...process.env,
      SKIP_NET_CHECKS: "1",
      SKIP_DB_CHECK: "1",
      SKIP_PW_DEPS: "1",
      SKIP_HANDLE_CHECK: "1",
    };
    execFileSync(
      "node",
      ["scripts/run-coverage.js", "backend/tests/openHandle.fail.js"],
      { env, encoding: "utf8" },
    );
  });
});
