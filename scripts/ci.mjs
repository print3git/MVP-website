#!/usr/bin/env node
import { execSync } from "child_process";
import { isOfflineEnv, logOfflineSkip } from "./net-mode.mjs";

const offline = isOfflineEnv();

if (
  offline &&
  process.env.SKIP_PW_DEPS === "1" &&
  !process.env.SKIP_NET_CHECKS
) {
  process.env.SKIP_NET_CHECKS = "1";
}

if (process.env.SKIP_PW_DEPS === "1") {
  process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";
}

if (offline) {
  console.log("offline mode: running ci");
}

try {
  if (offline) {
    logOfflineSkip("lockfile check");
  } else {
    execSync("npm run check:lockfile", { stdio: "inherit" });
  }
} catch (err) {
  console.error(
    "Lockfile mismatch detected. Run 'npm install' to regenerate package-lock.json.",
  );
  process.exit(1);
}
execSync("node scripts/run-npm-ci.js", { stdio: "inherit" });
execSync("npm run build --workspaces=false", { stdio: "inherit" });
execSync("npm test", { stdio: "inherit" });

