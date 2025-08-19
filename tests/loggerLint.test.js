const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const repoRoot = path.resolve(__dirname, "..");

function runEslint(rule, file) {
  const args = ["--no-install", "eslint", "--format", "json"];
  if (rule) {
    args.push("--rule", `${rule}:error`);
  }
  args.push(file);
  const res = spawnSync("npx", args, { cwd: repoRoot, encoding: "utf8" });
  return JSON.parse(res.stdout || "[]");
}

describe("logger lint rules", () => {
  const loggerFile = path.join(repoRoot, "src", "logger.js");

  test("logger.js has required jsdoc", () => {
    const results = runEslint("jsdoc/require-jsdoc", loggerFile);
    const msgs = results.flatMap((f) =>
      f.messages.filter((m) => m.ruleId === "jsdoc/require-jsdoc"),
    );
    expect(msgs).toEqual([]);
  });

  test("logger.js contains no console statements", () => {
    const results = runEslint("no-console", loggerFile);
    const msgs = results.flatMap((f) =>
      f.messages.filter((m) => m.ruleId === "no-console"),
    );
    expect(msgs).toEqual([]);
  });

  test("no-console rule flags console usage", () => {
    const tmp = path.join(repoRoot, `lint-${Date.now()}.js`);
    fs.writeFileSync(tmp, 'console.log("hi");');
    const results = runEslint("no-console", tmp);
    fs.unlinkSync(tmp);
    const msgs = results.flatMap((f) =>
      f.messages.filter((m) => m.ruleId === "no-console"),
    );
    expect(msgs).toHaveLength(1);
  });
});

describe("eslint helper is lint-free", () => {
  test("run-eslint-via-execa.mjs has no lint errors", () => {
    const file = path.join(
      repoRoot,
      "tests",
      "helpers",
      "run-eslint-via-execa.mjs",
    );
    const results = runEslint(null, file);
    const msgs = results.flatMap((f) => f.messages);
    expect(msgs).toEqual([]);
  });
});
