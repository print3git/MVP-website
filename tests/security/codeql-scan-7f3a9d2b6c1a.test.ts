const fs = require("fs");
const glob = require("glob");

describe("codeql security scans", () => {
  test("download urls use https", () => {
    const files = glob.sync("{scripts,backend,js}/**/*.{js,ts}", {
      nodir: true,
    });
    const issues = [];
    const urlRegex = /https?:\/\/[^\s'"`]+/g;
    for (const file of files) {
      const content = fs.readFileSync(file, "utf8");
      const matches = content.match(urlRegex) || [];
      for (const url of matches) {
        if (
          url.startsWith("http://") &&
          !/http:\/\/(localhost|127\.0\.0\.1)/.test(url)
        ) {
          issues.push(`${file}:${url}`);
        }
      }
    }
    expect(issues).toEqual([]);
  });

  test("no unescaped backslashes in scripts", () => {
    const files = glob.sync("scripts/**/*.{js,ts}", { nodir: true });
    const issues = [];
    const strRegex = /(['"`])((?:\\.|(?!\1).)*?)\\(?![\\nrt0'"`uux])/g;
    for (const file of files) {
      const content = fs.readFileSync(file, "utf8");
      let match;
      while ((match = strRegex.exec(content))) {
        issues.push(`${file}:${match.index}`);
      }
    }
    expect(issues).toEqual([]);
  });

  test("safe innerHTML usage", () => {
    const files = glob.sync("js/**/*.js", { nodir: true });
    let safeCount = 0;
    for (const file of files) {
      const content = fs.readFileSync(file, "utf8");
      if (/setSafeInnerHTML\s*\(/.test(content)) safeCount++;
    }
    expect(safeCount).toBeGreaterThan(0);
  });

  test("no env var shell concatenation", () => {
    const files = glob.sync("scripts/**/*.{js,ts}", { nodir: true });
    const issues = [];
    const pattern =
      /(execSync|spawnSync|spawn)\s*\(\s*`[^`]*\${[^`]*process\.env/;
    for (const file of files) {
      const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
      lines.forEach((line, idx) => {
        if (pattern.test(line)) issues.push(`${file}:${idx + 1}`);
      });
    }
    expect(issues).toEqual([]);
  });
});
