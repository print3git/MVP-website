"use strict";

const fs = require("fs/promises");
const path = require("path");
const { ESLint } = require("eslint");

async function main() {
  const eslint = new ESLint({
    extensions: [".js", ".ts"],
    overrideConfig: {
      ignorePatterns: ["node_modules/**", "tests/fixtures/**", "scripts/**"],
    },
  });

  const results = await eslint.lintFiles(["**/*.{js,ts}"]);
  const map = {};
  let hasError = false;

  for (const result of results) {
    for (const msg of result.messages) {
      const id = msg.ruleId || "unknown";
      if (!map[id]) map[id] = { count: 0, samples: [] };
      map[id].count++;
      if (map[id].samples.length < 5) {
        map[id].samples.push({
          file: path.relative(process.cwd(), result.filePath),
          line: msg.line,
          message: msg.message,
        });
      }
      if (msg.severity === 2) hasError = true;
    }
  }

  await fs.writeFile("lint-report.json", JSON.stringify(map, null, 2));
  process.exit(hasError ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
