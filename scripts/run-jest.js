#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const backendRoot = path.join(repoRoot, "backend");

function resolveFromPaths(mod) {
  for (const p of [repoRoot, backendRoot]) {
    try {
      return require.resolve(mod, { paths: [p] });
    } catch {
      /* ignore */
    }
  }
  return null;
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
  const offline = isOfflineEnv();
  if (offline) {
    logOfflineSkip("jest");
    return;
  }

  let runCLI;
  try {
    ({ runCLI } = require("@jest/core"));
  } catch {
    console.error(
      "Jest is not installed. Run `npm run setup` to install dependencies.",
    );
    process.exit(1);
  }

  if (!offline && !process.env.SKIP_ROOT_DEPS_CHECK) {
    require("./ensure-root-deps.js");
  }


  const skipNetChecks = process.env.SKIP_NET_CHECKS === "1";

  verifyFiles(args);
  console.log("run-jest cwd:", process.cwd());
  const corePath = resolveFromPaths("@jest/core");
  if (!corePath) {
    console.error("Missing jest core; run `npm run setup` before testing.");
    process.exit(1);
  }
  ({ runCLI } = require(corePath));
  const defaultConfig = path.resolve(repoRoot, "jest.config.cjs");
  const backendConfig = path.resolve(backendRoot, "jest.config.js");
  const defaultOfflineConfig = path.resolve(
    repoRoot,
    "jest.config.offline.cjs",
  );
  const backendOfflineConfig = path.resolve(
    backendRoot,
    "jest.config.offline.js",
  );
  const parsed = { _: [], config: defaultConfig };
  let awaitingValue = null;
  let configProvided = false;
  const shortMap = { t: "testNamePattern" };
  for (const arg of args) {
    if (awaitingValue) {
      parsed[awaitingValue] = arg;
      if (awaitingValue === "config") configProvided = true;
      awaitingValue = null;
      continue;
    }
    if (arg.startsWith("--")) {
      const [key, value] = arg.slice(2).split("=");
      if (value !== undefined) {
        parsed[key] = value;
        if (key === "config") configProvided = true;
      } else if (["help", "runTestsByPath", "passWithNoTests"].includes(key)) {
        parsed[key] = true;
      } else {
        awaitingValue = key;
      }
    } else if (arg.startsWith("-") && arg.length > 1) {
      const key = arg.slice(1);
      if (shortMap[key]) {
        awaitingValue = shortMap[key];
      } else {
        parsed._.push(arg);
      }
    } else {
      parsed._.push(arg);
    }
  }
  const isBackendTest = parsed._.some((p) => {
    const rel = path.relative(repoRoot, path.resolve(repoRoot, p));
    return rel.startsWith("backend" + path.sep);
  });
  if (isBackendTest && !configProvided) {
    parsed.config = backendConfig;
  }

  if (!offline && isBackendTest && !process.env.SKIP_BACKEND_DEPS_CHECK) {
    require(path.join(backendRoot, "scripts", "ensure-deps.js"));
  }
  // Reuse the earlier tsJestMissing flag rather than redeclaring it
  tsJestMissing = false;
  try {
    require.resolve("ts-jest");
  } catch {
    tsJestMissing = true;
    if (!offline && !skipNetChecks) {
      console.error("Missing ts-jest; run `npm run setup` before testing.");
      process.exit(1);
    }
  }
  if ((offline || skipNetChecks) && tsJestMissing) {
    parsed.config = isBackendTest ? backendOfflineConfig : defaultOfflineConfig;
    parsed._ = parsed._.map((p) => {
      if (p.endsWith(".ts")) {
        const jsPath = p.replace(/\.ts$/, ".js");
        if (fs.existsSync(jsPath)) return jsPath;
      }
      return p;
    });
  }
  if (parsed._.length) {
    parsed.runTestsByPath = true;
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
