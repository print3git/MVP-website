#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const backendRoot = path.join(repoRoot, "backend");

function collectTests(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const tests = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      tests.push(...collectTests(full));
    } else if (/\.(test|spec)\.(js|ts|tsx)$/.test(entry.name)) {
      tests.push(full);
    }
  }
  return tests.sort();
}

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
  const normalized = new Set();
  for (const arg of args) {
    if (arg === "--runTestsByPath") {
      checking = true;
      normalized.add(arg);
      continue;
    }
    const candidates = [
      path.resolve(process.cwd(), arg),
      path.resolve(repoRoot, arg),
      path.resolve(backendRoot, arg),
    ];
    const existing = candidates.find((p) => fs.existsSync(p));
    const isTestArg = checking || /\.(test|spec)\.(js|ts|tsx)$/.test(arg);
    if (existing) {
      const stat = fs.statSync(existing);
      if (stat.isDirectory()) {
        const files = collectTests(existing);
        if (!files.length) {
          console.error(`No test files found in directory: ${arg}`);
          process.exit(1);
        }
        for (const f of files) normalized.add(f);
      } else {
        normalized.add(existing);
      }
      continue;
    }
    if (isTestArg) {
      console.error(`Test file not found: ${arg}`);
      process.exit(1);
    }
    normalized.add(arg);
  }
  return Array.from(normalized);
}

async function run(args) {
  let runCLI;
  try {
    ({ runCLI } = require("@jest/core"));
  } catch {
    console.error(
      "Jest is not installed. Run `npm run setup` to install dependencies.",
    );
    process.exit(1);
  }

  if (!process.env.SKIP_ROOT_DEPS_CHECK) {
    require("./ensure-root-deps.js");
  }

  const skipNetChecks = process.env.SKIP_NET_CHECKS === "1";

  args = verifyFiles(args);
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

  if (isBackendTest && !process.env.SKIP_BACKEND_DEPS_CHECK) {
    require(path.join(backendRoot, "scripts", "ensure-deps.js"));
  }
  let tsJestMissing = false;
  try {
    require.resolve("ts-jest");
  } catch {
    tsJestMissing = true;
    if (!skipNetChecks) {
      console.error("Missing ts-jest; run `npm run setup` before testing.");
      process.exit(1);
    }
  }
  if (skipNetChecks && tsJestMissing) {
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
