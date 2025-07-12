#!/usr/bin/env node
const { execSync } = require("child_process");

if (process.env.SKIP_PW_DEPS) {
  console.log("SKIP_PW_DEPS is set; skipping host dependency check");
  process.exit(0);
}

function checkConnectivity() {
  if (process.env.SKIP_NET_CHECKS) return;
  try {
    execSync("npm ping", { stdio: "ignore" });
  } catch {
    console.error(
      "Unable to reach the npm registry. Check network connectivity or proxy settings.",
    );
    process.exit(1);
  }
  try {
    execSync("curl -sI https://cdn.playwright.dev", { stdio: "ignore" });
  } catch {
    console.error("Unable to reach https://cdn.playwright.dev");
    process.exit(1);
  }
}

function hostDepsInstalled() {
  try {
    const out = execSync("npx playwright install --with-deps --dry-run", {
      encoding: "utf8",
    });
    return !/Missing libraries/i.test(out);
  } catch {
    return false;
  }
}

checkConnectivity();

if (!hostDepsInstalled()) {
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
