jest.mock("child_process", () => ({ execSync: jest.fn() }));
const { execSync } = require("child_process");

const {
  verifyLockfileSync,
  checkDeprecatedDependencies,
  runNpmCi,
  checkAll,
} = require("../scripts/dependency-stability");

describe("dependency installation stability", () => {
  beforeEach(() => {
    execSync.mockReset();
  });

  test("detects lockfile mismatch", () => {
    execSync.mockReturnValueOnce("").mockReturnValueOnce("package-lock.json\n");
    expect(() => verifyLockfileSync()).toThrow(/Lockfile mismatch detected/);
    expect(execSync.mock.calls.map((c) => c[0])).toEqual([
      "npm install --no-audit --no-fund",
      "git diff --name-only package.json package-lock.json",
    ]);
  });

  test("detects deprecated deps", () => {
    execSync.mockReturnValueOnce("npm WARN deprecated foo\n");
    expect(() => checkDeprecatedDependencies()).toThrow(/deprecated/);
  });

  test("fails on dependency resolution errors", () => {
    execSync.mockImplementationOnce(() => {
      const err = new Error("fail");
      err.stderr = "npm ERR! broken";
      throw err;
    });
    expect(() => checkDeprecatedDependencies()).toThrow(
      /Dependency resolution failed/,
    );
  });

  test("flags postinstall failures", () => {
    execSync.mockImplementationOnce(() => {
      const err = new Error("fail");
      err.stderr = "postinstall script";
      throw err;
    });
    expect(() => runNpmCi()).toThrow(/Postinstall script failed/);
  });

  test("runs full check", () => {
    execSync
      .mockReturnValueOnce("")
      .mockReturnValueOnce("")
      .mockReturnValueOnce("")
      .mockReturnValueOnce("")
      .mockReturnValueOnce("");
    checkAll();
    expect(execSync.mock.calls.map((c) => c[0])).toEqual([
      "npm install --no-audit --no-fund",
      "git diff --name-only package.json package-lock.json",
      "npm ls",
      "npm ci --no-audit --no-fund",
      "npm run build",
    ]);
  });
});
