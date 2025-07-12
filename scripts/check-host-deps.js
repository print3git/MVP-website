#!/usr/bin/env node
const { execSync } = require("child_process");

function checkNetwork() {
  if (process.env.SKIP_NET_CHECKS) {
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
    console.error(
      "Failed to install Playwright host dependencies:",
      err.message,
    );
    process.exit(1);
  }
} else {
  console.log("Playwright host dependencies already satisfied.");
}
