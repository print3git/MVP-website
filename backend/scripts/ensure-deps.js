const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Fail fast when using the wrong Node version unless disabled for tests.
if (!process.env.SKIP_NODE_CHECK) {
  const nodeCheck = path.join(
    __dirname,
    "..",
    "..",
    "scripts",
    "check-node-version.js",
  );
  try {
    execSync(`node ${nodeCheck}`, { stdio: "inherit" });
  } catch {
    process.exit(1);
  }
}

const jestPath = "node_modules/.bin/jest";
const repoRoot = path.join(__dirname, "..", "..");
try {
  execSync(`mise trust ${repoRoot}`, { stdio: "ignore" });
  const miseToml = path.join(repoRoot, ".mise.toml");
  if (fs.existsSync(miseToml)) {
    execSync(`mise trust ${miseToml}`, { stdio: "ignore" });
  }
} catch {
  // ignore errors from mise trust to avoid masking real issues
}
const expressPath = path.join(repoRoot, "node_modules", "express");
const pwPath = path.join(repoRoot, "node_modules", "@playwright", "test");
const setupFlag = path.join(repoRoot, ".setup-complete");

const networkCheck = path.join(
  __dirname,
  "..",
  "..",
  "scripts",
  "network-check.js",
);

const aptCheck = path.join(__dirname, "..", "..", "scripts", "check-apt.js");

function runNetworkCheck() {
  if (process.env.SKIP_NET_CHECKS) {
    console.log("Skipping network check due to SKIP_NET_CHECKS");
    return;
  }
  try {
    execSync(`node ${networkCheck}`, { stdio: "inherit" });
  } catch {
    console.error(
      "Network check failed. Ensure access to the npm registry and Playwright CDN.",
    );
    process.exit(1);
  }
}

function canReachRegistry() {
  try {
    execSync("npm ping", { stdio: "ignore" });
    return true;
  } catch {
    console.error(
      "Unable to reach the npm registry. Check network connectivity or proxy settings.",
    );
    return false;
  }
}

function runSetup() {
  console.log("Setup flag missing. Running 'npm run setup'...");
  const env = { ...process.env };

  if (env.SKIP_NET_CHECKS && !env.SKIP_PW_DEPS) {
    env.SKIP_PW_DEPS = "1";
    env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD =
      env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD || "1";
  }
  if (!env.SKIP_PW_DEPS) {
    try {
      execSync(`node ${aptCheck}`, { stdio: "inherit" });
    } catch {
      console.warn(
        "APT repositories unreachable. Falling back to SKIP_PW_DEPS=1",
      );
      env.SKIP_PW_DEPS = "1";
    }
  }
  try {
    execSync("npm run setup", { stdio: "inherit", cwd: repoRoot, env });
  } catch (err) {
    if (env.SKIP_PW_DEPS) {
      console.warn(
        "Setup failed with SKIP_PW_DEPS, retrying without it to install browsers",
      );
      delete env.SKIP_PW_DEPS;
      execSync("npm run setup", { stdio: "inherit", cwd: repoRoot, env });
    } else {
      console.error("Failed to run setup:", err.message);
      process.exit(1);
    }
  }
}

if (!fs.existsSync(setupFlag)) {
  runNetworkCheck();
  if (!canReachRegistry()) process.exit(1);
  runSetup();
}

if (!fs.existsSync(expressPath)) {
  runNetworkCheck();
  if (!canReachRegistry()) process.exit(1);
  console.log("Express not found. Installing root dependencies...");
  try {
    execSync("npm ci", { stdio: "inherit", cwd: repoRoot });
  } catch (err) {
    console.error("Failed to install root dependencies:", err.message);
    process.exit(1);
  }
}

if (!fs.existsSync(pwPath)) {
  runNetworkCheck();
  if (!canReachRegistry()) process.exit(1);
  console.log("@playwright/test not found. Installing root dependencies...");
  try {
    execSync("npm ci", { stdio: "inherit", cwd: repoRoot });
  } catch (err) {
    console.error("Failed to install root dependencies:", err.message);
    process.exit(1);
  }
}

if (!fs.existsSync(jestPath)) {
  runNetworkCheck();
  if (!canReachRegistry()) process.exit(1);
  console.log("Jest not found. Installing backend dependencies...");
  try {
    execSync("npm ping", { stdio: "ignore" });
  } catch {
    console.error(
      "Unable to reach the npm registry. Check network connectivity or proxy settings.",
    );
    process.exit(1);
  }
  try {
    execSync("npm ci", { stdio: "inherit" });
  } catch (err) {
    console.error("Failed to install dependencies:", err.message);
    process.exit(1);
  }
}
