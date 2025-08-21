const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const repoRoot = path.join(__dirname, "..");

function runEslint(file) {
  return spawnSync("npx", ["eslint", file, "-f", "json"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
}

describe("eslint parses test files", () => {
  test("ts test file lints without parsing errors", () => {
    const tmp = path.join(__dirname, "tmp-eslint.ts");
    fs.writeFileSync(tmp, "export const num: number = 1;\n");
    const res = runEslint(tmp);
    fs.unlinkSync(tmp);
    if (res.status !== 0) console.error(res.stdout || res.stderr);
    expect(res.status).toBe(0);
    const messages = JSON.parse(res.stdout)[0].messages;
    const parsingErrors = messages.filter((m) =>
      /Parsing error/i.test(m.message),
    );
    expect(parsingErrors).toHaveLength(0);
  });
});
