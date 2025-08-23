#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const glob = require("glob");
const yaml = require("yaml");

function getActionsPermission(perms) {
  if (!perms) return null;
  if (typeof perms === "string") {
    if (perms === "read-all" || perms === "write-all") return "read";
    return null;
  }
  return perms.actions || null;
}

function runChecks(script, ctx) {
  const findings = [];
  const { file, job, step, perm } = ctx;
  const push = (rule, message, severity) => {
    findings.push({ file, job, step, rule, message, severity });
  };
  const trimmed = script.trim();
  if (!trimmed) {
    push("EMPTY_SCRIPT", "script is empty", "warning");
    return findings;
  }
  if (/require\(['"]@actions\/(core|github)['"]\)/.test(script)) {
    push("FORBIDDEN_REQUIRES", "use injected core/github", "error");
  }
  if (/(?:^|\n)\s*(?:const|let|var)\s+(core|github|context)\b/.test(script)) {
    push("SHADOWED_GLOBALS", "do not redeclare core/github/context", "error");
  }
  if (
    /github\.context/.test(script) ||
    (/github\.rest\./.test(script) && !/context/.test(script))
  ) {
    push(
      "INVALID_CONTEXT",
      "use context variable for workflow metadata",
      "warning",
    );
  }
  if (
    /new\s+Octokit\s*\(/.test(script) ||
    /github\.getOctokit\s*\(/.test(script)
  ) {
    push("RAW_OCTOKIT", "avoid manual Octokit creation", "warning");
  }
  if (
    /github\.rest\./.test(script) &&
    (!perm || !["read", "write"].includes(String(perm).toLowerCase()))
  ) {
    push("MISSING_PERMISSIONS", "permissions.actions read required", "error");
  }
  if (
    !/try\s*{[\s\S]*}\s*catch\s*\([^)]+\)\s*{[\s\S]*core\.setFailed/.test(
      script,
    )
  ) {
    push(
      "NO_TRY_CATCH",
      "wrap script in try/catch and call core.setFailed",
      "error",
    );
  }
  if (
    /github\.rest\.actions\.listJobsForWorkflowRun/.test(script) &&
    !/github\.paginate/.test(script)
  ) {
    push(
      "NO_AWAIT_PAGINATION",
      "use github.paginate for listJobsForWorkflowRun",
      "warning",
    );
  }
  if (
    /owner:\s*['"][^'"]+['"]/.test(script) ||
    /repo:\s*['"][^'"]+['"]/.test(script)
  ) {
    push(
      "HARDCODED_OWNER_REPO",
      "use context.repo for owner and repo",
      "warning",
    );
  }
  if (/process\.env\.GITHUB_(TOKEN|PAT)/.test(script)) {
    push(
      "SIDE_EFFECT_SECRETS",
      "use injected github client instead of env token",
      "warning",
    );
  }
  return findings;
}

function analyzeWorkflows(files) {
  const findings = [];
  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    let doc;
    try {
      doc = yaml.parse(content);
    } catch (err) {
      findings.push({
        file: path.relative(process.cwd(), file),
        job: "",
        step: "",
        rule: "INVALID_YAML",
        message: err.message,
        severity: "warning",
      });
      continue;
    }
    const workflowPerm = getActionsPermission(doc && doc.permissions);
    const jobs = (doc && doc.jobs) || {};
    for (const [jobName, job] of Object.entries(jobs)) {
      const jobPerm = getActionsPermission(job.permissions) || workflowPerm;
      const steps = job.steps || [];
      for (const step of steps) {
        if (
          typeof step.uses === "string" &&
          /^actions\/github-script@/.test(step.uses)
        ) {
          const script =
            step.with && step.with.script ? String(step.with.script) : "";
          const stepName = step.name || "";
          const res = runChecks(script, {
            file: path.relative(process.cwd(), file),
            job: jobName,
            step: stepName,
            perm: jobPerm,
          });
          findings.push(...res);
        }
      }
    }
  }
  return findings;
}

async function main() {
  const files = glob.sync(".github/workflows/**/*.yml", { nodir: true });
  const findings = analyzeWorkflows(files);
  if (!fs.existsSync("ci/guards")) {
    fs.mkdirSync("ci/guards", { recursive: true });
  }
  const reportPath = path.join("ci", "guards", "github-script-report.json");
  fs.writeFileSync(reportPath, JSON.stringify({ findings }, null, 2));
  if (findings.length) {
    console.log("| file | job | step | rule | severity | message |");
    console.log("| --- | --- | --- | --- | --- | --- |");
    for (const f of findings) {
      console.log(
        `| ${f.file} | ${f.job} | ${f.step} | ${f.rule} | ${f.severity} | ${f.message} |`,
      );
    }
  } else {
    console.log("No github-script issues found.");
  }
  if (findings.some((f) => f.severity === "error")) process.exit(1);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { analyzeWorkflows };
