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

if (!fs.existsSync(pluginPath)) {
  runNetworkCheck();
  if (!process.env.SKIP_NET_CHECKS && !canReachRegistry()) process.exit(1);
  console.log("Dependencies missing. Installing root dependencies...");
  try {
    execSync("npm ping", { stdio: "ignore" });
  } catch {
    console.error(
      "Unable to reach the npm registry. Check network connectivity or proxy settings.",
    );
    process.exit(1);
  }
  const install = () => {
    try {
      execSync("npm ci", { stdio: "inherit" });
      return true;
    } catch (err) {
      const msg = String(err.message || err);
      if (msg.includes("EUSAGE")) {
        console.warn("npm ci failed, falling back to 'npm install'");
        execSync("npm install", { stdio: "inherit" });
        return true;
      }
      if (/ECONNRESET|ENOTFOUND|network|ETIMEDOUT/i.test(msg)) {
        return false;
      }
      console.error("Failed to install dependencies:", err.message);
      process.exit(1);
    }
  };

  for (let attempt = 1; attempt <= 3; attempt++) {
    if (install()) break;
    console.warn(
      `npm ci failed due to network issue, retrying (${attempt}/3)...`,
    );
    runNetworkCheck();
    if (attempt === 3) {
      console.error("Failed to install dependencies after multiple attempts.");
      process.exit(1);
    }
  }
}
