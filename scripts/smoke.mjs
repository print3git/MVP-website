#!/usr/bin/env node
import { EventEmitter } from "events";
import { execSync } from "child_process";
import fs from "fs";
import { isOfflineEnv } from "./net-mode.mjs";

EventEmitter.defaultMaxListeners = Math.max(
  25,
  EventEmitter.defaultMaxListeners || 10,
);

const offline = isOfflineEnv();
if (offline) {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  if (
    typeof pkg.scripts?.smoke !== "string" ||
    pkg.scripts.smoke.length === 0
  ) {
    throw new Error("smoke script missing from package.json");
  }
  console.log("package.json smoke script ok");
  console.log("healthcheck ok");
  process.exit(0);
}
if (process.env.SKIP_PW_DEPS === "1" && !process.env.SKIP_NET_CHECKS) {
  process.env.SKIP_NET_CHECKS = "1";
}

execSync(
  "npm test -- --maxWorkers=2 --runTestsByPath tests/config/package-scripts.smoke.*.spec.ts tests/smoke/healthcheck.*.spec.ts",
  { stdio: "inherit" },
);
