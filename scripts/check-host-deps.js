#!/usr/bin/env node
const { execSync } = require("child_process");

function checkNetwork() {
  if (process.env.SKIP_NET_CHECKS) {
    return;
  }
  try {
    const script = require("path").join(__dirname, "network-check.js");
    execSync(`node ${script}`, {
      stdio: "pipe",
      encoding: "utf8",
    });
    return true;
  } catch (err) {
    const output = `${err.stdout || ""}${err.stderr || ""}`;
    if (err.stdout) process.stdout.write(err.stdout);
    if (err.stderr) process.stderr.write(err.stderr);
    if (process.env.SKIP_PW_DEPS) {
      console.warn(
        "Network check failed. Skipping Playwright host dependencies because SKIP_PW_DEPS=1 is set.",
      );
      return false;
    }
    if (/Playwright CDN/.test(output)) {
      console.error(
        "Playwright CDN unreachable. Set SKIP_PW_DEPS=1 to skip Playwright dependencies.",
      );
      return false;
    }
    console.error(
      "Network check failed. Ensure access to the npm registry and Playwright CDN. Set SKIP_PW_DEPS=1 to skip Playwright dependencies.",
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

if (hostDepsInstalled()) {
  console.log("Playwright host dependencies already satisfied.");
  process.exit(0);
}

if (process.env.SKIP_PW_DEPS) {
  console.warn(
    "SKIP_PW_DEPS is set but Playwright host dependencies are missing. Skipping installation...",
  );
  process.exit(0);
}

if (checkNetwork() === false) {
  // When the network check fails and SKIP_PW_DEPS is set, skip Playwright
  // dependency installation instead of exiting with an error. This mirrors the
  // behavior of the validate-env script.
  process.exit(0);
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
