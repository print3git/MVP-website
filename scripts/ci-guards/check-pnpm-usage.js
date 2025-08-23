#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const YAML = require("yaml");

function findWorkflows(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findWorkflows(p));
    } else if (entry.isFile() && p.endsWith(".yml")) {
      files.push(p);
    }
  }
  return files;
}

function analyzeWorkflow(file, pkgVersion) {
  const content = fs.readFileSync(file, "utf8");
  const wf = YAML.parse(content);
  const jobs = wf.jobs || {};
  const results = [];
  for (const [jobName, job] of Object.entries(jobs)) {
    const steps = job.steps || [];
    let usesPnpm = false;
    let hasSetup = false;
    let versionMismatch = false;
    for (const step of steps) {
      if (typeof step.run === "string" && /\bpnpm\b/.test(step.run)) {
        usesPnpm = true;
      }
      if (step.uses && /pnpm\/action-setup@/.test(step.uses)) {
        hasSetup = true;
        const stepVersion = step.with && step.with.version;
        if (stepVersion && pkgVersion && stepVersion !== pkgVersion) {
          versionMismatch = true;
        }
      }
      if (
        step.uses &&
        step.uses.startsWith("actions/setup-node") &&
        step.with &&
        step.with.cache === "pnpm"
      ) {
        usesPnpm = true;
      }
    }
    if (usesPnpm) {
      const ok = hasSetup && !versionMismatch;
      const info = {
        workflow: file,
        job: jobName,
        ok,
      };
      if (!hasSetup) info.missingSetup = true;
      if (versionMismatch) info.versionMismatch = true;
      results.push(info);
    }
  }
  return results;
}

async function main() {
  const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
  const pkgPath = path.join(root, "package.json");
  let pkgVersion = null;
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      if (pkg.packageManager && pkg.packageManager.startsWith("pnpm@")) {
        pkgVersion = pkg.packageManager.split("@")[1];
      }
    } catch {}
  }
  const workflowsDir = path.join(root, ".github", "workflows");
  let files = [];
  if (fs.existsSync(workflowsDir)) {
    files = findWorkflows(workflowsDir);
  }
  let all = [];
  for (const file of files) {
    all = all.concat(analyzeWorkflow(file, pkgVersion));
  }
  console.log(JSON.stringify(all, null, 2));
  console.log("\n| Workflow | Job | Status |");
  console.log("| --- | --- | --- |");
  for (const r of all) {
    const reason = r.missingSetup
      ? "missing pnpm/action-setup"
      : r.versionMismatch
        ? "version mismatch"
        : "";
    console.log(
      `| ${path.relative(root, r.workflow)} | ${r.job} | ${r.ok ? "✅" : "❌ " + reason} |`,
    );
  }
  if (all.some((r) => !r.ok)) {
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { analyzeWorkflow };
