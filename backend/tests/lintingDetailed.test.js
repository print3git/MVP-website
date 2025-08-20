const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const backendDir = path.join(__dirname, "..");

test("detailed backend ESLint report", () => {
  // eslint 9.x errors if an ignored directory is missing. The coverage
  // directory is gitignored and may not exist in fresh clones, so ensure it
  // is present before invoking ESLint.
  const coverageDir = path.join(backendDir, "coverage");
  if (!fs.existsSync(coverageDir)) {
    fs.mkdirSync(coverageDir, { recursive: true });
    fs.writeFileSync(path.join(coverageDir, ".gitkeep"), "");
  }
  const cmd = `npx eslint -f json .`;
  let output;
  try {
    output = execSync(cmd, {
      cwd: backendDir,
      encoding: "utf8",
    });
  } catch (err) {
    console.error(`ESLint command: ${cmd}`);
    if (err.stdout) console.error(err.stdout);
    if (err.stderr) console.error(err.stderr);
    throw err;
  }
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
