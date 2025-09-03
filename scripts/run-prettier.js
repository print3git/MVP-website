#!/usr/bin/env node
const { spawnSync } = require("child_process");
const { createRequire } = require("module");

async function main() {
  const { isOfflineEnv, logOfflineSkip } = await import("./net-mode.mjs");
  if (isOfflineEnv()) {
    logOfflineSkip("prettier");
    return;
  }

  const require = createRequire(__filename);
  let prettierPath;
  try {
    prettierPath = require.resolve("prettier/bin/prettier.cjs");
  } catch {
    console.error(
      "Prettier is not installed. Run `npm run setup` to install dependencies.",
    );
    process.exit(1);
  }

  const result = spawnSync(
    process.execPath,
    [prettierPath, ...process.argv.slice(2)],
    { stdio: "inherit" },
  );
  process.exit(result.status == null ? 1 : result.status);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
