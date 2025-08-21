const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const repoRoot = path.join(__dirname, "..");
const configPath = path.join(__dirname, "eslint-ci.config.cjs");

function runEslint(file) {
  return spawnSync(
    "npx",
    ["eslint", file, "-f", "json", "--config", configPath],
    { cwd: repoRoot, encoding: "utf8" },
  );
}

describe("CI eslint regression checks", () => {
  test("flags missing jsdoc and console usage", () => {
    const tmp = path.join(repoRoot, "tmp-ci-lint.js");
    fs.writeFileSync(tmp, "function demo(x){console.log(x);return x;}\n");
    const res = runEslint(tmp);
    fs.unlinkSync(tmp);
    expect(res.status).not.toBe(0);
    const messages = JSON.parse(res.stdout)[0].messages.map((m) => m.ruleId);
    expect(messages).toEqual(
      expect.arrayContaining(["jsdoc/require-jsdoc", "no-console"]),
    );
  });

  test("validates params, returns and disallows blacklisted tags", () => {
    const tmp = path.join(repoRoot, "tmp-ci-jsdoc.js");
    fs.writeFileSync(
      tmp,
      "/**\n * Multiply numbers.\n * @todo remove\n */\nfunction mul(a,b){return a*b;}\n",
    );
    const res = runEslint(tmp);
    fs.unlinkSync(tmp);
    expect(res.status).not.toBe(0);
    const rules = JSON.parse(res.stdout)[0].messages.map((m) => m.ruleId);
    expect(rules).toEqual(
      expect.arrayContaining([
        "jsdoc/require-param",
        "jsdoc/require-returns",
        "jsdoc/check-tag-names",
      ]),
    );
  });

  test("parses mjs helpers with async/await", () => {
    const file = path.join(__dirname, "helpers", "run-eslint-via-execa.mjs");
    const res = runEslint(file);
    if (res.status !== 0) {
      console.error(res.stdout);
      console.error(res.stderr);
    }
    expect(res.status).toBe(0);
  });
});
