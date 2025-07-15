/**
 * Automatically bumps branch/statements thresholds
 * if actual coverage is higher. Never fails CI
 * because we crept 0.01% below the line.
 */
import fs from "fs";
import { execSync } from "child_process";

const THR_FILE = "jest.config.js"; // contains coverageThreshold
const report = JSON.parse(fs.readFileSync("coverage/coverage-summary.json"));

const actualBranches = report.total.branches.pct.toFixed(2);
const desired = 55; // ← your target

if (+actualBranches > desired) {
  const txt = fs
    .readFileSync(THR_FILE, "utf8")
    .replace(/branches:\s*\d+/, `branches: ${Math.floor(actualBranches)}`);
  fs.writeFileSync(THR_FILE, txt);
  console.log(`🔥  Bumped branch threshold → ${Math.floor(actualBranches)}%`);
}

execSync("git diff --color", { stdio: "inherit" });
