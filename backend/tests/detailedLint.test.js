const { execSync } = require("child_process");
const path = require("path");

function runEslint(cwd) {
  try {
    const out = execSync("npx eslint . -f json --max-warnings=0", {
      cwd,
      encoding: "utf8",
    });
    return JSON.parse(out);
  } catch (err) {
    if (err.stdout) {
      try {
        return JSON.parse(err.stdout);
      } catch (_) {
        console.error(err.stdout);
      }
    }
    throw err;
  }
}

describe("eslint detailed results", () => {
  const repoRoot = path.join(__dirname, "..", "..");
  const rootResults = runEslint(repoRoot);
  const backendResults = runEslint(path.join(repoRoot, "backend"));

  const all = [
    ...rootResults.map((r) => ({ cwd: "root", ...r })),
    ...backendResults.map((r) => ({ cwd: "backend", ...r })),
  ];

  all.forEach((file) => {
    const relative = path.relative(repoRoot, file.filePath);
    const messages = file.messages.filter((m) => m.severity >= 2);
    const output = messages
      .map((m) => `${m.line}:${m.column} ${m.message} (${m.ruleId})`)
      .join("\n");
    test(`${file.cwd} lint ${relative}`, () => {
      if (output) console.error("\n" + output);
      expect(messages).toEqual([]);
    });
  });
});
