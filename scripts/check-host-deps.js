#!/usr/bin/env node
const { execSync } = require("child_process");

function checkNetwork() {
  if (process.env.SKIP_NET_CHECKS || process.env.SKIP_PW_DEPS) {
    return;
  }
  try {
    execSync("node scripts/network-check.js", { stdio: "ignore" });
  } catch {
    console.error(
      "Network check failed. Ensure access to the npm registry and Playwright CDN.",
    );
    process.exit(1);
  }
}

function hostDepsInstalled() {
  try {
    const out = execSync("npx playwright install --with-deps --dry-run 2>&1", {
      encoding: "utf8",
    });
    return !/(Missing libraries|Host system is missing dependencies)/i.test(
      out,
    );
  } catch {
    return false;
  }
}

checkNetwork();

if (!hostDepsInstalled()) {
  if (process.env.SKIP_PW_DEPS) {
    console.error(
      "Playwright host dependencies are missing. Run 'npx playwright install --with-deps' or remove SKIP_PW_DEPS.",
    );
    process.exit(1);
  }
  console.log("Playwright host dependencies missing. Installing...");
  try {
    execSync("CI=1 npx playwright install --with-deps", { stdio: "inherit" });
  } catch (err) {
    const msg = String(err.message || "");
    console.error("Failed to install Playwright host dependencies:", msg);
    if (/code:\s*100/.test(msg)) {
      console.error(
        "apt-get failure detected. Retrying without system dependencies...",
      );
      try {
        execSync("CI=1 npx playwright install", { stdio: "inherit" });
        console.error(
          "Set SKIP_PW_DEPS=1 to skip Playwright dependencies in restricted environments.",
        );
      } catch (err2) {
        console.error("Fallback install failed:", err2.message);
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  }
} else {
  console.log("Playwright host dependencies already satisfied.");
}
