#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

if (!process.env.SKIP_ROOT_DEPS_CHECK) {
  require("./ensure-root-deps.js");
}

function verifyFiles(args) {
  let checking = false;
  for (const arg of args) {
    if (arg === "--runTestsByPath") {
      checking = true;
      continue;
    }
    if (checking || /\.(test|spec)\.(js|ts|tsx)$/.test(arg)) {
      const file = path.resolve(process.cwd(), arg);
      if (!fs.existsSync(file)) {
        console.error(`Test file not found: ${arg}`);
        process.exit(1);
      }
    }
  }
}

async function run(args) {
  const { isOfflineEnv, logOfflineSkip } = await import("./net-mode.mjs");
  if (isOfflineEnv()) {
    logOfflineSkip("jest");
    process.exit(0);
  }
  verifyFiles(args);
  console.log("run-jest cwd:", process.cwd());
  const { runCLI } = require("@jest/core");
  const configPath = path.resolve(__dirname, "..", "jest.config.cjs");
  const parsed = { _: [], config: configPath };
  let awaitingValue = null;
  for (const arg of args) {
    if (awaitingValue) {
      parsed[awaitingValue] = arg;
      awaitingValue = null;
      continue;
    }
    if (arg.startsWith("--")) {
      const [key, value] = arg.slice(2).split("=");
      if (value !== undefined) {
        parsed[key] = value;
      } else if (["help", "runTestsByPath"].includes(key)) {
        parsed[key] = true;
      } else {
        awaitingValue = key;
      }
    } else {
      parsed._.push(arg);
    }
  }
  const { results } = await runCLI(parsed, [process.cwd()]);
  process.exit(results.success ? 0 : 1);
}

if (require.main === module) {
  run(process.argv.slice(2)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = run;
