const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) walk(path.join(dir, entry.name), files);
    else files.push(path.join(dir, entry.name));
  }
  return files;
}

test("browser globals guarded for SSR", () => {
  const base = path.join(process.cwd(), "frontend");
  if (!fs.existsSync(base)) return test.skip("no frontend");
  const files = walk(base).filter((f) => /\.(js|ts|tsx)$/.test(f));
  const offenders = [];
  files.forEach((file) => {
    const lines = fs.readFileSync(file, "utf8").split(/\n/);
    lines.forEach((line, idx) => {
      if (
        /\b(window|document|localStorage)\b/.test(line) &&
        !/typeof\s+(window|document|localStorage)/.test(line)
      ) {
        offenders.push(`${file}:${idx + 1} ${line.trim()}`);
      }
    });
  });
  if (offenders.length) {
    assert.fail(`UnGuarded browser globals:
${offenders.join("\n")}
Fix: wrap in typeof window !== 'undefined' guards or move to effect hooks.`);
  }
});
