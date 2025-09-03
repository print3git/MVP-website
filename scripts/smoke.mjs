#!/usr/bin/env node
import { EventEmitter } from "events";
import { execSync } from "child_process";
import { isOfflineEnv, logOfflineSkip } from "./net-mode.mjs";

EventEmitter.defaultMaxListeners = Math.max(
  25,
  EventEmitter.defaultMaxListeners || 10,
);

const offline = isOfflineEnv();
if (offline || process.env.CI_NO_SMOKE === "1") {
  logOfflineSkip("smoke");
  process.exit(0);
}
if (process.env.SKIP_PW_DEPS === "1" && !process.env.SKIP_NET_CHECKS) {
  process.env.SKIP_NET_CHECKS = "1";
}

execSync(
  "npm test -- --maxWorkers=2 --runTestsByPath tests/config/package-scripts.smoke.*.spec.ts tests/smoke/healthcheck.*.spec.ts",
  { stdio: "inherit" },
);
