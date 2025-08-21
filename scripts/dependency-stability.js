const { execSync } = require("child_process");

function run(cmd, errMsg) {
  try {
    return execSync(cmd, {
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
    });
  } catch (err) {
    const output = String(err.stdout || "") + String(err.stderr || "");
    throw new Error(`${errMsg}:\n${output}`);
  }
}

function verifyLockfileSync() {
  run("npm install --no-audit --no-fund", "npm install failed");
  const diff = run(
    "git diff --name-only package.json package-lock.json",
    "git diff failed",
  ).trim();
  if (diff) {
    throw new Error(`Lockfile mismatch detected: ${diff}`);
  }
}

function checkDeprecatedDependencies() {
  let output;
  try {
    output = run("npm ls", "npm ls failed");
  } catch (err) {
    if (/deprecated|unsupported/i.test(err.message)) {
      throw new Error(
        `Deprecated or unsupported dependencies detected:\n${err.message}`,
      );
    }
    throw new Error(`Dependency resolution failed:\n${err.message}`);
  }
  if (/deprecated|unsupported/i.test(output)) {
    throw new Error(
      `Deprecated or unsupported dependencies detected:\n${output}`,
    );
  }
}

function runNpmCi() {
  try {
    run("npm ci --no-audit --no-fund", "npm ci failed");
  } catch (err) {
    if (/postinstall/i.test(err.message)) {
      throw new Error(
        `Postinstall script failed during npm ci:\n${err.message}`,
      );
    }
    throw err;
  }
}

function runFrontendCi() {
  run(
    "npm ci --prefix frontend --no-audit --no-fund",
    "npm ci frontend failed",
  );
}

function runBuild() {
  run("npm run build --prefix frontend", "npm run build failed");
}

function checkAll() {
  verifyLockfileSync();
  checkDeprecatedDependencies();
  runNpmCi();
  runFrontendCi();
  runBuild();
  console.log("Dependency installation stability check passed.");
}

if (require.main === module) {
  try {
    checkAll();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

module.exports = {
  run,
  verifyLockfileSync,
  checkDeprecatedDependencies,
  runNpmCi,
  runBuild,
  checkAll,
};
