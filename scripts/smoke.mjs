#!/usr/bin/env node
import { EventEmitter } from "events";
import { execSync } from "child_process";
import { isOfflineEnv, logOfflineSkip } from "./net-mode.mjs";

EventEmitter.defaultMaxListeners = Math.max(
  25,
  EventEmitter.defaultMaxListeners || 10,
);

const offline = isOfflineEnv();

if (process.env.SKIP_PW_DEPS === "1" && !process.env.SKIP_NET_CHECKS) {
  process.env.SKIP_NET_CHECKS = "1";
}

if (offline && process.env.SKIP_PW_DEPS !== "1") {
  logOfflineSkip("smoke");
  process.exit(0);
}

execSync(
  "npm test -- --maxWorkers=2 --runTestsByPath tests/config/package-scripts.smoke.*.spec.js tests/smoke/healthcheck.*.spec.js",
  { stdio: "inherit" },
);
