const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const jestPath = "node_modules/.bin/jest";
const rootExpress = path.join(__dirname, "..", "..", "node_modules", "express");

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
  execSync("npm ci", { stdio: "inherit" });
}

if (!fs.existsSync(rootExpress)) {
  if (!canReachRegistry()) process.exit(1);
  console.log("Root dependencies missing. Installing...");
  execSync("npm ci --no-audit --no-fund", {
    cwd: path.resolve(__dirname, ".."),
    stdio: "inherit",
  });
}
