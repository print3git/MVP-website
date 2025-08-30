#!/usr/bin/env node
import { EventEmitter } from "events";
import { execSync } from "child_process";
import { isOfflineEnv, logOfflineSkip } from "./net-mode.mjs";

EventEmitter.defaultMaxListeners = Math.max(
  25,
  EventEmitter.defaultMaxListeners || 10,
);

if (isOfflineEnv()) {
  logOfflineSkip("smoke");
  process.exit(0);
}

execSync(
  "npm test -- --maxWorkers=2 --runTestsByPath tests/config/package-scripts.smoke.*.spec.ts tests/smoke/healthcheck.*.spec.ts",
  { stdio: "inherit" },
);
