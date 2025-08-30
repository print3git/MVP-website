#!/usr/bin/env node
const fs = require("fs");
const { spawnSync } = require("child_process");
const path = require("path");
const os = require("os");

if (!process.env.SKIP_ROOT_DEPS_CHECK) {
  require("./ensure-root-deps.js");
} else {
  try {
    require.resolve("@babel/plugin-syntax-typescript");
  } catch {
    console.error(
      "Missing root dependencies. Run 'npm run setup' before running tests.",
    );
    process.exit(1);
  }
}

function findBackendRoot(start) {
  let dir = start;
  while (true) {
    const candidate = path.join(dir, "backend", "package.json");
    if (fs.existsSync(candidate)) return path.dirname(candidate);
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

const cliArgs = process.argv.slice(2);
if (
  process.env.SKIP_NET_CHECKS === "1" &&
  !cliArgs.some((a) => a.startsWith("--maxWorkers"))
) {
  cliArgs.push("--maxWorkers=2");
}
if (process.env.SKIP_NET_CHECKS === "1" && !process.env.ALLOW_NET_TESTS) {
  process.env.TEST_ENV_OFFLINE = "1";
}
const backendDir = findBackendRoot(process.cwd());
if (!backendDir || !fs.existsSync(path.join(backendDir, "package.json"))) {
  console.error("backend/package.json not found");
  process.exit(1);
}
const repoRoot = path.dirname(backendDir);
const requiresBackendDeps = cliArgs
  .filter((a) => !a.startsWith("-"))
  .some((arg) => {
    const abs = path.resolve(repoRoot, arg);
    return abs.startsWith(backendDir);
  });

if (requiresBackendDeps) {
  try {
    require.resolve("nodemailer", { paths: [backendDir] });
  } catch {
    console.error(
      "Missing backend dependencies. Run 'npm run setup' before running tests.",
    );
    process.exit(1);
  }
}

function verifyFiles(args) {
  let checking = false;
  for (const arg of args) {
    if (arg === "--runTestsByPath") {
      checking = true;
      continue;
    }
    if (checking || /\.(test|spec)\.(js|ts)$/.test(arg)) {
      const file = path.resolve(repoRoot, arg);
      if (!fs.existsSync(file)) {
        console.error(`Test file not found: ${arg}`);
        process.exit(1);
      }
    }
  }
}

function runJest(args) {
  verifyFiles(args);
  const jestBin = path.join(backendDir, "node_modules", ".bin", "jest");

  let jestArgs = [...args];
  if (jestArgs[0] === "--") {
    jestArgs.shift();
  }

  let outputFile;
  const outputIdx = jestArgs.findIndex(
    (a) => a === "--outputFile" || a.startsWith("--outputFile="),
  );
  if (outputIdx !== -1) {
    if (jestArgs[outputIdx] === "--outputFile") {
      outputFile = jestArgs[outputIdx + 1];
    } else {
      outputFile = jestArgs[outputIdx].split("=")[1];
    }
  }

  const fileArgs = jestArgs.filter((arg) => !arg.startsWith("-"));
  const runFromRoot = fileArgs.some((arg) => {
    const abs = path.resolve(repoRoot, arg);
    return !abs.startsWith(backendDir);
  });
  const hasExplicitPaths = fileArgs.length > 0;

  let tempConfigPath;
  if (hasExplicitPaths) {
    const configPath = runFromRoot
      ? path.join(repoRoot, "jest.config.js")
      : path.join(backendDir, "jest.config.js");
    const baseConfig = { ...require(configPath) };
    delete baseConfig.coverageThreshold;
    baseConfig.collectCoverage = false;
    baseConfig.rootDir = runFromRoot ? repoRoot : backendDir;
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "jest-config-"));
    tempConfigPath = path.join(tmpDir, "jest.config.js");
    fs.writeFileSync(
      tempConfigPath,
      `module.exports = ${JSON.stringify(baseConfig)};`,
    );
    jestArgs.push(
      "--config",
      tempConfigPath,
      "--coverage=false",
      "--passWithNoTests",
    );
  }

  if (!runFromRoot) {
    jestArgs = jestArgs.map((arg) => {
      if (arg.startsWith("-")) return arg;
      const abs = path.resolve(repoRoot, arg);
      return path.relative(backendDir, abs);
    });

    if (outputFile && !path.isAbsolute(outputFile)) {
      const resolved = path.join(repoRoot, outputFile);
      if (jestArgs[outputIdx] === "--outputFile") {
        jestArgs[outputIdx + 1] = resolved;
      } else {
        jestArgs[outputIdx] = `--outputFile=${resolved}`;
      }
    }
  }

  const env = { ...process.env };
  if (runFromRoot) {
    env.NODE_PATH = [
      path.join(repoRoot, "node_modules"),
      path.join(backendDir, "node_modules"),
      env.NODE_PATH || "",
    ]
      .filter(Boolean)
      .join(path.delimiter);
  }
  const options = {
    stdio: "inherit",
    cwd: runFromRoot ? repoRoot : backendDir,
    env,
  };

  const rootJestBin = path.join(repoRoot, "node_modules", ".bin", "jest");
  let result;
  if (runFromRoot) {
    if (!fs.existsSync(rootJestBin)) {
      console.error(
        "Missing root Jest binary. Run 'npm install' in the repo root first.",
      );
      process.exit(1);
    }
    result = spawnSync(rootJestBin, jestArgs, options);
  } else if (fs.existsSync(jestBin)) {
    result = spawnSync(jestBin, jestArgs, options);
  } else {
    if (!fs.existsSync(rootJestBin)) {
      console.error(
        "Missing root Jest binary. Run 'npm install' in the repo root first.",
      );
      process.exit(1);
    }
    result = spawnSync(rootJestBin, jestArgs, options);
  }

  if (tempConfigPath) {
    try {
      fs.unlinkSync(tempConfigPath);
    } catch {}
  }

  if (result.status !== 0) process.exit(result.status || 1);
}

if (require.main === module) {
  runJest(process.argv.slice(2));
}

module.exports = runJest;
