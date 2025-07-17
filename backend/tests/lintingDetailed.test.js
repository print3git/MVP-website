const { execSync } = require("child_process");
const path = require("path");

const backendDir = path.join(__dirname, "..");

test("detailed backend ESLint report", () => {
  const output = execSync(`npx eslint -f json .`, {
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
