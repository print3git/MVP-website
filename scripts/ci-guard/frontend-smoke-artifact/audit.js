#!/usr/bin/env node
// @ts-check
const fs = require("fs");
const path = require("path");
const yaml = require("yaml");

/**
 * Audit the given workflow files.
 * @param {string[]} files
 * @returns {{ok:boolean, files: Record<string, any>}}
 */
function auditFiles(files) {
  const summary = { ok: true, files: {} };
  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const doc = yaml.parse(content) || {};
    const jobs = doc.jobs || {};
    const fileSummary = { ok: true, jobs: {} };
    for (const [jobName, job] of Object.entries(jobs)) {
      const steps = Array.isArray(job.steps) ? job.steps : [];
      const jobSummary = { ok: true, errors: [] };
      const stepTexts = steps.map((s) => JSON.stringify(s));
      const referencesDist = stepTexts.some(
        (t) => t && t.includes("frontend/dist"),
      );
      if (!referencesDist) {
        fileSummary.jobs[jobName] = jobSummary;
        continue;
      }
      const downloadStep = steps.find(
        (s) =>
          typeof s.uses === "string" &&
          s.uses.includes("actions/download-artifact") &&
          s.with &&
          typeof s.with.name === "string" &&
          s.with.name.startsWith("frontend-dist"),
      );
      if (downloadStep) {
        fileSummary.jobs[jobName] = jobSummary;
        continue;
      }
      const buildIdx = steps.findIndex(
        (s) =>
          typeof s.run === "string" && /pnpm\s+(build|run\s+build)/.test(s.run),
      );
      if (buildIdx === -1) {
        jobSummary.ok = false;
        jobSummary.errors.push("missing build step");
        fileSummary.ok = summary.ok = false;
        fileSummary.jobs[jobName] = jobSummary;
        continue;
      }
      const buildStep = steps[buildIdx];
      if (buildStep["working-directory"] !== "frontend") {
        jobSummary.ok = false;
        jobSummary.errors.push("build step must run in frontend directory");
      }
      if (/\bnpm\b/.test(buildStep.run)) {
        jobSummary.ok = false;
        jobSummary.errors.push("build must use pnpm");
      }
      const verifyIdx = steps.findIndex(
        (s) =>
          typeof s.run === "string" &&
          s.run.includes("frontend/dist/index.html") &&
          /test\s+-f/.test(s.run),
      );
      if (verifyIdx === -1 || verifyIdx < buildIdx) {
        jobSummary.ok = false;
        jobSummary.errors.push("missing verify step");
      }
      const nodeStep = steps
        .slice(0, buildIdx)
        .find(
          (s) =>
            typeof s.uses === "string" &&
            s.uses.startsWith("actions/setup-node") &&
            s.with &&
            (String(s.with["node-version"] || "").includes("20") ||
              String(s.with["node-version"] || "").includes("${{")),
        );
      if (!nodeStep) {
        jobSummary.ok = false;
        jobSummary.errors.push("missing Node 20 setup");
      } else if (nodeStep.with && nodeStep.with.cache !== "pnpm") {
        jobSummary.ok = false;
        jobSummary.errors.push("setup-node cache must be pnpm");
      }
      const corepackIdx = steps.findIndex(
        (s) => typeof s.run === "string" && s.run.trim() === "corepack enable",
      );
      if (corepackIdx === -1 || corepackIdx > buildIdx) {
        jobSummary.ok = false;
        jobSummary.errors.push("missing corepack enable before build");
      }
      const pnpmSetupIdx = steps.findIndex(
        (s) =>
          typeof s.uses === "string" && s.uses.startsWith("pnpm/action-setup"),
      );
      if (pnpmSetupIdx === -1 || pnpmSetupIdx > buildIdx) {
        jobSummary.ok = false;
        jobSummary.errors.push("missing pnpm/action-setup before build");
      } else if (
        steps[pnpmSetupIdx].with &&
        "version" in steps[pnpmSetupIdx].with
      ) {
        jobSummary.ok = false;
        jobSummary.errors.push("pnpm/action-setup must not pin version");
      }
      if (!jobSummary.ok) fileSummary.ok = summary.ok = false;
      fileSummary.jobs[jobName] = jobSummary;
    }
    summary.files[file] = fileSummary;
  }
  return summary;
}

function main() {
  const repoRoot = process.cwd();
  const args = process.argv.slice(2);
  let files;
  if (args.length) {
    files = args;
  } else {
    const wfDir = path.join(repoRoot, ".github", "workflows");
    files = fs
      .readdirSync(wfDir)
      .filter((f) => f.endsWith(".yml"))
      .map((f) => path.join(wfDir, f));
  }
  const summary = auditFiles(files);
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.ok) process.exit(1);
}

if (require.main === module) {
  main();
}

module.exports = { auditFiles };
