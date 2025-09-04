#!/usr/bin/env node
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

/**
 * Resolve the local eslint executable without invoking `npx`,
 * which would attempt to reach the network when eslint isn't
 * already installed. We search a handful of directories that
 * exist in this repository to keep the lookup offline.
 */
const eslintBin = (() => {
  const searchRoots = [
    process.cwd(),
    path.resolve(__dirname, ".."),
    path.resolve(__dirname, "../frontend"),
    path.resolve(__dirname, "../backend"),
  ];
  for (const root of searchRoots) {
    const candidate = path.join(root, "node_modules", ".bin", "eslint");
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  console.error("ESLint not found in local node_modules.");
  process.exit(1);
})();

const args = process.argv.slice(2);
const nodePath = [
  path.resolve(__dirname, "../node_modules"),
  path.resolve(__dirname, "../backend/node_modules"),
  path.resolve(__dirname, "../frontend/node_modules"),
  process.env.NODE_PATH,
]
  .filter(Boolean)
  .join(path.delimiter);

const result = spawnSync(eslintBin, ["--error-on-unmatched-pattern", ...args], {
  encoding: "utf-8",
  stdio: ["inherit", "inherit", "pipe"],
  env: { ...process.env, NODE_PATH: nodePath },
});

if (result.status !== 0) {
  const stderr = result.stderr || "";
  if (/No files matching/.test(stderr)) {
    console.error(
      "No files matched for ESLint; failing to prevent silent skips.",
    );
    process.exit(1);
  }
  process.stderr.write(stderr);
  process.exit(result.status);
}
