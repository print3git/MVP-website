const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const jestPath = "node_modules/.bin/jest";

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
