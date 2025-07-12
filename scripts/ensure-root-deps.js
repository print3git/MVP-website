const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const pluginPath = path.join(
  __dirname,
  "..",
  "node_modules",
  "@babel",
  "plugin-syntax-typescript",
  "package.json",
);

const networkCheck = path.join(__dirname, "network-check.js");

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

if (!fs.existsSync(pluginPath)) {
  runNetworkCheck();
  if (!canReachRegistry()) process.exit(1);
  console.log("Dependencies missing. Installing root dependencies...");
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
    const msg = String(err.message || err);
    if (msg.includes("EUSAGE")) {
      console.warn("npm ci failed, falling back to 'npm install'");
      try {
        execSync("npm install", { stdio: "inherit" });
      } catch (err2) {
        console.error("Failed to install dependencies:", err2.message);
        process.exit(1);
      }
    } else {
      console.error("Failed to install dependencies:", err.message);
      process.exit(1);
    }
  }
}
