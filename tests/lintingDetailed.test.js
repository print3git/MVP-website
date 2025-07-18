const { execSync } = require("child_process");

test("detailed ESLint report", () => {
  const output = execSync("npx eslint . -f json", {
    encoding: "utf8",
    env: { ...process.env, NODE_V8_COVERAGE: "" },
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
