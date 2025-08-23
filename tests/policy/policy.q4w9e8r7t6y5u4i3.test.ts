const { enforceAutofixPolicy } = require("../../codex-driver");

describe("autofix policy enforcement", () => {
  const base = {
    changedFiles: [
      ".github/workflows/test.yml",
      "scripts/ci-build.js",
      "tests/ci-sample.test.js",
    ],
    openAutofixPRs: 0,
    testsA: 1,
    testsB: 10,
  };

  test("allows compliant changes", () => {
    expect(() => enforceAutofixPolicy(base)).not.toThrow();
  });

  test("blocks excessive open PRs", () => {
    expect(() => enforceAutofixPolicy({ ...base, openAutofixPRs: 5 })).toThrow(
      /too many/,
    );
  });

  test("blocks forbidden paths", () => {
    expect(() =>
      enforceAutofixPolicy({ ...base, changedFiles: ["src/runtime/index.js"] }),
    ).toThrow(/forbidden/);
  });

  test("requires tests for A and minimum for B", () => {
    expect(() => enforceAutofixPolicy({ ...base, testsA: 0 })).toThrow(
      /tests required/,
    );
    expect(() => enforceAutofixPolicy({ ...base, testsB: 5 })).toThrow(
      /at least/,
    );
  });
});
