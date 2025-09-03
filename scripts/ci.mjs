#!/usr/bin/env node
import { execSync } from "child_process";
import { isOfflineEnv } from "./net-mode.mjs";

isOfflineEnv();

if (process.env.SKIP_PW_DEPS === "1") {
  process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";
}

execSync("node scripts/run-npm-ci.js", { stdio: "inherit" });
execSync("npm run build --workspaces=false", { stdio: "inherit" });
execSync("npm test", { stdio: "inherit" });
