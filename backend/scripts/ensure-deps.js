const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const jestPath = "node_modules/.bin/jest";
const repoRoot = path.join(__dirname, "..", "..");
const expressPath = path.join(repoRoot, "node_modules", "express");
const playwrightPath = path.join(
  repoRoot,
  "node_modules",
  "@playwright",
  "test",
);
const setupFlag = path.join(repoRoot, ".setup-complete");

const networkCheck = path.join(
  __dirname,
  "..",
  "..",
  "scripts",
  "network-check.js",
);

function runNetworkCheck() {
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
  try {
    execSync("npm run setup", { stdio: "inherit", cwd: repoRoot });
  } catch (err) {
    console.error("Failed to run setup:", err.message);
    process.exit(1);
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

if (!fs.existsSync(playwrightPath)) {
  runNetworkCheck();
  if (!canReachRegistry()) process.exit(1);
  console.log("Playwright not found. Installing root dependencies...");
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
