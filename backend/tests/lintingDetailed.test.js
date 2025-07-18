const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const backendDir = path.join(__dirname, "..");

test("detailed backend ESLint report", () => {
  // eslint 9.x errors if an ignored directory is missing. The coverage
  // directory is gitignored and may not exist in fresh clones, so ensure it
  // is present before invoking ESLint.
  const coverageDir = path.join(backendDir, "coverage");
  if (!fs.existsSync(coverageDir)) fs.mkdirSync(coverageDir);
  const output = execSync(`npx eslint -f json --ignore-pattern coverage "."`, {
    cwd: backendDir,
    encoding: "utf8",
  });
  const results = JSON.parse(output);
  const errors = results
    .flatMap((r) => r.messages.map((m) => ({ ...m, file: r.filePath })))
    .filter((m) => m.severity === 2);
  if (errors.length) {
    const snippet = errors
      .slice(0, 10)
      .map((e) => `${e.file}:${e.line}:${e.column} ${e.ruleId}`)
      .join("\n");
    console.error("\n⛔ ESLint errors:\n" + snippet + "\n");
  }
  expect(errors).toEqual([]);
});
