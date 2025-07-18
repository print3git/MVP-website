const fs = require("fs");
const glob = require("glob");

describe("shell injection scan", () => {
  test("no unsafe exec or spawn with env/user interpolation", () => {
    const files = glob.sync("backend/**/*.{js,ts}", { nodir: true });
    const issues = [];
    const pattern =
      /(execSync?|spawn)\s*\(\s*`[^`]*\${[^`]*(process\.env|req\.|request\.|ctx\.|context\.|user\.|params\.|query\.|body\.)/;

    for (const file of files) {
      const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
      lines.forEach((line, idx) => {
        if (pattern.test(line)) {
          issues.push(`${file}:${idx + 1}`);
        }
      });
    }

    if (issues.length) {
      throw new Error(
        `Potential unsafe exec/spawn usage detected:\n${issues.join("\n")}`,
      );
    }
  });
});
