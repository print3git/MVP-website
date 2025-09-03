#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

let runCLI;
try {
  ({ runCLI } = require("@jest/core"));
} catch (err) {
  try {
    ({ runCLI } = require(
      path.join(__dirname, "..", "backend", "node_modules", "@jest", "core"),
    ));
    process.env.SKIP_ROOT_DEPS_CHECK = "1";
    const backendModules = path.join(
      __dirname,
      "..",
      "backend",
      "node_modules",
    );
    process.env.NODE_PATH = [backendModules, process.env.NODE_PATH]
      .filter(Boolean)
      .join(path.delimiter);
    require("module").Module._initPaths();
    console.warn("Using backend @jest/core fallback");
  } catch {
    throw err;
  }
}

if (!process.env.SKIP_ROOT_DEPS_CHECK) {
  try {
    require("./ensure-root-deps.js");
  } catch (err) {
    console.warn("Skipping root dependency check:", err.message);
  }
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
  verifyFiles(args);
  console.log("run-jest cwd:", process.cwd());
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
