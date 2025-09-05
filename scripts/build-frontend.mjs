#!/usr/bin/env node
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { runNpmCi } = require("./run-npm-ci.js");

runNpmCi("frontend");
execSync("npm run build", { cwd: "frontend", stdio: "inherit" });
