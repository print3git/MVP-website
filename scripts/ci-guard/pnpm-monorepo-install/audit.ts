#!/usr/bin/env node
// @ts-check
const fs = require("fs");
const path = require("path");
const yaml = require("yaml");

const repoRoot = process.cwd();
const workflowsDir = path.join(repoRoot, ".github", "workflows");
const stateDir = path.join(repoRoot, "ci-guard", "pnpm-monorepo-install");
const rootsFile = path.join(stateDir, "roots.txt");
const summaryFile = path.join(stateDir, "summary.json");

function normalize(p) {
  return (
    p
      .replace(/\\/g, "/")
      .replace(/\/+$|^\.\//g, "")
      .trim() || "."
  );
}

function discoverRoots() {
  /** @type {string[]} */
  const roots = [];
  const ignore = new Set(["node_modules", ".git"]);
  if (fs.existsSync(path.join(repoRoot, "package.json"))) roots.push(".");
  /** @param {string} dir */
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (ignore.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (fs.existsSync(path.join(full, "package.json"))) {
          roots.push(path.relative(repoRoot, full) || ".");
        }
        walk(full);
      }
    }
  }
  walk(repoRoot);
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(rootsFile, roots.join("\n"));
  return roots;
}

function readRoots() {
  if (fs.existsSync(rootsFile)) {
    return fs.readFileSync(rootsFile, "utf8").split(/\r?\n/).filter(Boolean);
  }
  return discoverRoots();
}

/**
 * @param {any} job
 * @param {string} jobName
 * @param {string} wfName
 * @param {string[]} roots
 * @param {any[]} violations
 */
function auditJob(job, jobName, wfName, roots, violations) {
  const wfDefault = job.workflowDefault || ".";
  const jobDefault =
    job.defaults && job.defaults.run && job.defaults.run["working-directory"];
  let hasNode = false;
  let hasCorepack = false;
  let hasPnpmSetup = false;
  let jobHasPnpm = false;
  let jobHasNpm = false;
  const steps = job.steps || [];
  for (const step of steps) {
    if (step.uses) {
      const uses = String(step.uses);
      if (/actions\/setup-node@/.test(uses)) {
        const v = step.with && step.with["node-version"];
        if (v && String(v).startsWith("20")) hasNode = true;
      }
      if (/pnpm\/action-setup@/.test(uses)) hasPnpmSetup = true;
    }
    if (step.run && /corepack enable/.test(step.run)) hasCorepack = true;
    if (step.run && /\bnpm\s+(?:ci|install)/.test(step.run)) jobHasNpm = true;
    if (!step.run || !/\bpnpm install/.test(step.run)) continue;
    jobHasPnpm = true;
    const dir = normalize(
      step["working-directory"] || jobDefault || wfDefault || ".",
    );
    const cmd = step.run;
    if (!/--frozen-lockfile/.test(cmd)) {
      violations.push({
        file: wfName,
        job: jobName,
        step: step.name || "pnpm install",
        message: "missing --frozen-lockfile",
      });
    }
    if (!hasNode || !hasCorepack || !hasPnpmSetup) {
      const missing = [];
      if (!hasNode) missing.push("setup-node");
      if (!hasCorepack) missing.push("corepack");
      if (!hasPnpmSetup) missing.push("pnpm/action-setup");
      violations.push({
        file: wfName,
        job: jobName,
        step: step.name || "pnpm install",
        message: `missing bootstrap: ${missing.join(", ")}`,
      });
    }
    if (
      !dir.includes("${{") &&
      !roots.includes(dir) &&
      !(dir === "." && roots.includes("."))
    ) {
      violations.push({
        file: wfName,
        job: jobName,
        step: step.name || "pnpm install",
        message: `install in non-package dir: ${dir}`,
      });
    }
  }
  if (jobHasNpm && jobHasPnpm) {
    violations.push({
      file: wfName,
      job: jobName,
      step: "mixed",
      message: "mixed npm and pnpm installs",
    });
  }
}

function audit() {
  const roots = readRoots();
  const violations = [];
  const files = fs.existsSync(workflowsDir)
    ? fs.readdirSync(workflowsDir).filter((f) => /\.ya?ml$/.test(f))
    : [];
  for (const file of files) {
    const wfPath = path.join(workflowsDir, file);
    let wf;
    try {
      wf = yaml.parse(fs.readFileSync(wfPath, "utf8"));
    } catch {
      continue;
    }
    const wfName = wf.name || file;
    const wfDefault =
      wf.defaults && wf.defaults.run && wf.defaults.run["working-directory"];
    const jobs = wf.jobs || {};
    for (const [jobName, job] of Object.entries(jobs)) {
      auditJob(
        { ...job, workflowDefault: wfDefault },
        jobName,
        file,
        roots,
        violations,
      );
    }
  }
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(summaryFile, JSON.stringify({ violations }, null, 2));
  if (violations.length) {
    console.error("pnpm monorepo install audit failed");
    process.exit(1);
  }
}

const mode = process.argv[2];
if (mode === "--discover") {
  discoverRoots();
} else {
  audit();
}
