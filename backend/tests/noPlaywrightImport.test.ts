const fs = require("fs");
const path = require("path");

function collectFiles(dir) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(collectFiles(full));
    } else if (entry.name.endsWith(".js") || entry.name.endsWith(".ts")) {
      results.push(full);
    }
  }
  return results;
}

test("no test imports playwright package directly", () => {
  const root = path.resolve(__dirname, "..");
  const dirs = ["tests", "backend/tests"];
  const offenders = [];
  for (const dir of dirs) {
    const absolute = path.join(root, dir);
    if (!fs.existsSync(absolute)) continue;
    for (const file of collectFiles(absolute)) {
      if (file.endsWith("noPlaywrightImport.test.ts")) continue;
      const content = fs.readFileSync(file, "utf8");
      if (
        content.includes("require('playwright')") ||
        content.includes('require("playwright")') ||
        content.includes("from 'playwright'") ||
        content.includes('from "playwright"')
      ) {
        offenders.push(path.relative(root, file));
      }
    }
  }
  expect(offenders).toEqual([]);
});
