#!/usr/bin/env node
const { spawnSync } = require("child_process");
const path = require("path");
const env = { ...process.env, SKIP_NET_CHECKS: "1", SKIP_PW_DEPS: "1" };
const script = path.join(__dirname, "assert-setup.js");
const result = spawnSync("node", [script], { stdio: "inherit", env });
process.exit(result.status);
