#!/usr/bin/env node
const fs = require("fs");
const { execSync } = require("child_process");
const path = require("path");

if (!process.env.SKIP_ROOT_DEPS_CHECK) {
  require("./ensure-root-deps.js");
}

function runJest(args) {
  const repoRoot = path.resolve(__dirname, "..");
  const backendDir = path.join(repoRoot, "backend");
  const jestBin = path.join(backendDir, "node_modules", ".bin", "jest");

  const runFromRoot = args.some((arg) => {
    const abs = path.resolve(repoRoot, arg);
    return !abs.startsWith(backendDir);
  });

  const cmdArgs = args.join(" ");
  const env = { ...process.env };
  if (runFromRoot) {
    env.NODE_PATH = [path.join(repoRoot, "node_modules"), env.NODE_PATH || ""]
      .filter(Boolean)
      .join(path.delimiter);
  }
  const options = {
    stdio: "inherit",
    cwd: runFromRoot ? repoRoot : backendDir,
    env,
  };

  if (fs.existsSync(jestBin)) {
    execSync(`${jestBin} ${cmdArgs}`, options);
  } else {
    execSync(`npm test --prefix backend -- ${cmdArgs}`, options);
  }
}

if (require.main === module) {
  runJest(process.argv.slice(2));
}

module.exports = runJest;
