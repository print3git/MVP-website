import fs from "node:fs";
import path from "node:path";
import yaml from "yaml";

const requiredBranches = ["dev", "00000production"];
const workflowsDir = path.join(process.cwd(), ".github", "workflows");

function hasRequiredBranches(trigger) {
  if (!trigger) return false;
  let branches = trigger.branches;
  if (!branches) return false;
  if (typeof branches === "string") branches = [branches];
  if (!Array.isArray(branches)) return false;
  return requiredBranches.every((b) => branches.includes(b));
}

function checkPaths(obj) {
  return (
    obj &&
    (Object.prototype.hasOwnProperty.call(obj, "paths") ||
      Object.prototype.hasOwnProperty.call(obj, "paths-ignore"))
  );
}

const files = fs
  .readdirSync(workflowsDir)
  .filter(
    (f) =>
      (f.endsWith(".yml") || f.endsWith(".yaml")) &&
      !f.startsWith("_") &&
      f !== "ci-trigger-auditor.yml",
  );
let failures = [];

for (const file of files) {
  const fullPath = path.join(workflowsDir, file);
  const content = fs.readFileSync(fullPath, "utf8");
  let doc;
  try {
    doc = yaml.parse(content);
  } catch (err) {
    failures.push(
      `--- a/.github/workflows/${file}\n+++ b/.github/workflows/${file}\n@@ Parse error\n- ${err.message}`,
    );
    continue;
  }
  const fileDiffs = [];
  const triggers = doc.on || {};
  const push = triggers.push;
  const pr = triggers.pull_request;
  if (!hasRequiredBranches(push)) {
    fileDiffs.push(
      "@@ Missing push trigger\n- push trigger with dev and 00000production not found\n+ push:\n+   branches:\n+     - dev\n+     - 00000production",
    );
  }
  if (!hasRequiredBranches(pr)) {
    fileDiffs.push(
      "@@ Missing pull_request trigger\n- pull_request trigger with dev and 00000production not found\n+ pull_request:\n+   branches:\n+     - dev\n+     - 00000production",
    );
  }
  if (checkPaths(triggers)) {
    fileDiffs.push(
      "@@ Risky top-level path filters\n- paths or paths-ignore at top level\n+ remove top-level paths filters",
    );
  }
  for (const [eventName, config] of Object.entries(triggers)) {
    if (checkPaths(config)) {
      fileDiffs.push(
        `@@ Risky path filters for on.${eventName}\n- contains paths or paths-ignore\n+ remove path filters to avoid skipping builds`,
      );
    }
  }
  const jobs = doc.jobs || {};
  for (const [jobName, job] of Object.entries(jobs)) {
    if (Object.prototype.hasOwnProperty.call(job, "if")) {
      fileDiffs.push(
        `@@ Job-level conditional in ${jobName}\n- if: ${job.if}\n+ remove job-level if to ensure registration`,
      );
    }
  }
  if (fileDiffs.length) {
    failures.push(
      `--- a/.github/workflows/${file}\n+++ b/.github/workflows/${file}\n${fileDiffs.join("\n")}\n`,
    );
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
