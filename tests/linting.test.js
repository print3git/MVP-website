const { execSync } = require("child_process");

test("repository passes ESLint with no warnings", () => {
  try {
    // run ESLint in JSON format so we can show the offending file and rule
    execSync("npx eslint . -f json --max-warnings=0", {
      stdio: "pipe",
      encoding: "utf-8",
    });
  } catch (error) {
    console.error("\n⛔ ESLint found problems:\n");
    if (error.stdout) {
      try {
        const results = JSON.parse(error.stdout);
        const lines = results
          .flatMap((r) =>
            r.messages.map(
              (m) => `${r.filePath}:${m.line}:${m.column} ${m.ruleId}`,
            ),
          )
          .slice(0, 10)
          .join("\n");
        console.error(lines + "\n");
      } catch {
        console.error(error.stdout);
      }
    }
    if (error.stderr) console.error(error.stderr);
    throw error;
  }
});
