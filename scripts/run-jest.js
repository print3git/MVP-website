#!/usr/bin/env node
const fs = require("fs");
const { execSync } = require("child_process");
const path = require("path");

if (!process.env.SKIP_ROOT_DEPS_CHECK && !process.env.JEST_WORKER_ID) {
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

try {
  require.resolve("nodemailer", {
    paths: [path.join(__dirname, "..", "backend")],
  });
} catch {
  console.error(
    "Missing backend dependencies. Run 'npm run setup' before running tests.",
  );
  process.exit(1);
}

function verifyFiles(args) {
  const repoRoot = path.resolve(__dirname, "..");
  let checking = false;
  for (const arg of args) {
    if (arg === "--runTestsByPath") {
      checking = true;
      continue;
    }
    if (checking || /\.test\.(js|ts)$/.test(arg)) {
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
  const repoRoot = path.resolve(__dirname, "..");
  const backendDir = path.join(repoRoot, "backend");
  const jestBin = path.join(backendDir, "node_modules", ".bin", "jest");

  const hasFileArgs = args.some((arg) => !arg.startsWith("-"));
  let jestArgs = [...args];
  if (hasFileArgs && !jestArgs.includes("--runTestsByPath")) {
    jestArgs.unshift("--runTestsByPath");
  }
  if (!jestArgs.includes("--runInBand")) {
    jestArgs.push("--runInBand");
  }

  const fileArgs = jestArgs.filter(
    (arg) => arg !== "--runTestsByPath" && !arg.startsWith("-"),
  );
  const runFromRoot = fileArgs.some((arg) => {
    const abs = path.resolve(repoRoot, arg);
    return !abs.startsWith(backendDir);
  });

  if (!runFromRoot) {
    jestArgs = jestArgs.map((arg) => {
      if (arg === "--runTestsByPath" || arg.startsWith("-")) return arg;
      const abs = path.resolve(repoRoot, arg);
      return path.relative(backendDir, abs);
    });
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

  if (fs.existsSync(jestBin)) {
    execSync(`${jestBin} ${jestArgs.join(" ")}`, options);
  } else {
    execSync(`npm test --prefix backend -- ${jestArgs.join(" ")}`, options);
  }
}

if (require.main === module) {
  runJest(process.argv.slice(2));
}

module.exports = runJest;
