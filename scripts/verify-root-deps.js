#!/usr/bin/env node
const modules = ["@eslint/js", "eslint"];
let missing = [];
for (const mod of modules) {
  try {
    require.resolve(mod);
  } catch {
    missing.push(mod);
  }
}
if (missing.length) {
  console.error(
    `\u274c Missing dependencies: ${missing.join(", ")}. Run 'npm ci' at repo root.`,
  );
  process.exit(1);
}
