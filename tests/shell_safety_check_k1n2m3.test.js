const fs = require("fs");
const path = require("path");

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...walk(p));
    else if (e.isFile() && (p.endsWith(".js") || p.endsWith(".ts")))
      files.push(p);
  }
  return files;
}

describe("shell safety", () => {
  test("no unsafe execSync use", () => {
    const scriptDir = path.join(__dirname, "..", "backend", "scripts");
    const testDir = path.join(__dirname, "..", "backend", "tests");
    const files = [...walk(scriptDir), ...walk(testDir)];

    for (const file of files) {
      const code = fs.readFileSync(file, "utf8");
      const regex = /\bexecSync\s*\(/g;
      let match;
      while ((match = regex.exec(code))) {
        const after = code.slice(match.index + match[0].length).trimStart();
        const firstChar = after[0];
        const preceding = code.slice(
          Math.max(0, match.index - 15),
          match.index,
        );
        const isAssignment = /=\s*$/.test(preceding);
        const isString =
          firstChar === '"' || firstChar === "'" || firstChar === "`";
        const isEscaped = after.startsWith("shellescape");
        if (!isString && !isEscaped && !isAssignment) {
          throw new Error(`Unsafe execSync usage in ${file}`);
        }
      }
    }
  });
});
