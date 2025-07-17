const { execSync } = require("child_process");
const fs = require("fs");

describe("linting diagnostics", () => {
  test("root: pnpm exec eslint . exits with code 0", () => {
    try {
      execSync("pnpm exec eslint .", { stdio: "pipe", encoding: "utf8" });
    } catch (err) {
      console.error("\nroot eslint stdout:\n" + err.stdout);
      console.error("\nroot eslint stderr:\n" + err.stderr);
      throw err;
    }
  });

  test("backend: pnpm exec eslint . exits with code 0", () => {
    try {
      execSync("pnpm exec eslint .", {
        cwd: "backend",
        stdio: "pipe",
        encoding: "utf8",
      });
    } catch (err) {
      console.error("\nbackend eslint stdout:\n" + err.stdout);
      console.error("\nbackend eslint stderr:\n" + err.stderr);
      throw err;
    }
  });

  test("no ESLint warnings", () => {
    const out = execSync("pnpm exec eslint . -f json", {
      encoding: "utf8",
    });
    const results = JSON.parse(out);
    const warnings = results.flatMap((r) =>
      r.messages.filter((m) => m.severity === 1),
    );
    if (warnings.length) {
      console.error(
        "\nESLint warnings:\n" +
          warnings
            .map((w) => `${w.ruleId} at ${w.line}:${w.column}`)
            .join("\n"),
      );
    }
    expect(warnings).toEqual([]);
  });

  test("no ESLint errors", () => {
    const out = execSync("pnpm exec eslint . -f json", {
      encoding: "utf8",
    });
    const results = JSON.parse(out);
    const errors = results.flatMap((r) =>
      r.messages.filter((m) => m.severity === 2),
    );
    if (errors.length) {
      console.error(
        "\nESLint errors:\n" +
          errors.map((e) => `${e.ruleId} at ${e.line}:${e.column}`).join("\n"),
      );
    }
    expect(errors).toEqual([]);
  });

  test("config resolves from root", () => {
    execSync("pnpm exec eslint . --print-config tests/linting.test.js", {
      stdio: "pipe",
      encoding: "utf8",
    });
  });

  test("config resolves from backend", () => {
    execSync("pnpm exec eslint server.js --print-config", {
      cwd: "backend",
      stdio: "pipe",
      encoding: "utf8",
    });
  });

  test("root vs backend yield same results", () => {
    const root = execSync("pnpm exec eslint backend/server.js -f json", {
      encoding: "utf8",
    });
    const back = execSync("pnpm exec eslint server.js -f json", {
      cwd: "backend",
      encoding: "utf8",
    });
    expect(root).toBe(back);
  });

  test("eslint writes to output file", () => {
    const logPath = "/tmp/eslint.log";
    execSync(`pnpm exec eslint . -f json -o ${logPath}`);
    const stat = fs.statSync(logPath);
    expect(stat.size).toBeGreaterThan(0);
  });

  test("CI flag does not change output", () => {
    const normal = execSync("pnpm exec eslint . -f json", { encoding: "utf8" });
    const ci = execSync("pnpm exec eslint . -f json", {
      encoding: "utf8",
      env: { ...process.env, CI: "1" },
    });
    expect(normal).toBe(ci);
  });
});
