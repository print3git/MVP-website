#!/usr/bin/env node
// @ts-check
const fs = require("fs");
const path = require("path");
const yaml = require("yaml");

const repoRoot = path.resolve(__dirname, "..");
const workflowsDir = path.join(repoRoot, ".github", "workflows");
const ciDir = path.join(repoRoot, "ci");
const TEST_KEYWORDS = [
  "jest",
  "vitest",
  "playwright",
  "npm test",
  "pnpm test",
  "yarn test",
];

function detectExpectedPackages() {
  const candidates = ["root", "frontend", "backend", "docs", "e2e"];
  const configPrefixes = ["jest.config", "vitest.config", "playwright.config"];
  const expected = [];
  for (const pkg of candidates) {
    const dir = pkg === "root" ? repoRoot : path.join(repoRoot, pkg);
    if (!fs.existsSync(dir)) continue;
    const hasPackageJson = fs.existsSync(path.join(dir, "package.json"));
    let hasConfig = false;
    try {
      const entries = fs.readdirSync(dir);
      hasConfig = entries.some((f) =>
        configPrefixes.some((p) => f.startsWith(p)),
      );
    } catch {
      hasConfig = false;
    }
    if (hasPackageJson || hasConfig) expected.push(pkg);
  }
  return expected;
}

function parseWorkflows(expected) {
  const coverage = {};
  expected.forEach((p) => (coverage[p] = []));
  const disabled = [];
  const allChecks = new Set();
  const files = fs
    .readdirSync(workflowsDir)
    .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));

  for (const file of files) {
    const wfPath = path.join(workflowsDir, file);
    const content = fs.readFileSync(wfPath, "utf8");
    let wf;
    try {
      wf = yaml.parse(content);
    } catch (e) {
      console.warn(`Failed to parse ${file}: ${e.message}`);
      continue;
    }
    const wfName = wf.name || file;
    const wfDefault =
      wf.defaults && wf.defaults.run && wf.defaults.run["working-directory"];
    const jobs = wf.jobs || {};
    for (const [jobName, job] of Object.entries(jobs)) {
      const jobCheck = `${wfName} / ${jobName}`;
      allChecks.add(jobCheck);
      if (job.if && String(job.if).trim().toLowerCase() === "false") {
        disabled.push(jobCheck);
      }
      const jobDefault =
        job.defaults &&
        job.defaults.run &&
        job.defaults.run["working-directory"];
      const steps = job.steps || [];
      for (const step of steps) {
        if (step.if && String(step.if).trim().toLowerCase() === "false") {
          disabled.push(`${jobCheck} / ${step.name || "unnamed step"}`);
        }
        const text = `${step.name || ""}\n${step.run || ""}`.toLowerCase();
        if (!TEST_KEYWORDS.some((k) => text.includes(k))) continue;
        let dir = step["working-directory"] || jobDefault || wfDefault || ".";
        const runCmd = step.run || "";
        const prefixMatch = runCmd.match(/--prefix[= ](\S+)/);
        if (prefixMatch) dir = prefixMatch[1];
        let pkg = "root";
        if (/frontend/.test(dir)) pkg = "frontend";
        else if (/backend/.test(dir)) pkg = "backend";
        else if (/docs/.test(dir)) pkg = "docs";
        else if (/e2e/.test(dir)) pkg = "e2e";
        if (!coverage[pkg]) coverage[pkg] = [];
        coverage[pkg].push(`${wfName}/${jobName}`);
      }
    }
  }
  return { coverage, disabled, allChecks: Array.from(allChecks) };
}

function main() {
  const expected = detectExpectedPackages();
  const { coverage, disabled, allChecks } = parseWorkflows(expected);
  const missing = expected.filter(
    (p) => !coverage[p] || coverage[p].length === 0,
  );

  const tableLines = [
    "| Package | Discovered Tests | CI Jobs covering it |",
    "| --- | --- | --- |",
  ];
  for (const pkg of expected) {
    const jobs = coverage[pkg] || [];
    tableLines.push(
      `| ${pkg} | ${jobs.length > 0 ? "yes" : "no"} | ${jobs.join("<br>")} |`,
    );
  }
  const table = tableLines.join("\n");

  const summary = {
    expectedPackages: expected,
    coverage,
    missingPackages: missing,
    disabledItems: disabled,
  };

  const requiredFile = path.join(ciDir, "required-checks.json");
  let requiredMissing = [];
  if (fs.existsSync(requiredFile)) {
    try {
      const required = JSON.parse(fs.readFileSync(requiredFile, "utf8"));
      if (Array.isArray(required)) {
        requiredMissing = required.filter((n) => !allChecks.includes(n));
        if (requiredMissing.length)
          console.warn("Missing required checks:", requiredMissing.join(", "));
      }
    } catch (e) {
      console.warn("Failed to read required-checks.json:", e.message);
    }
  }
  summary.requiredChecksMissing = requiredMissing;

  fs.mkdirSync(ciDir, { recursive: true });
  fs.writeFileSync(
    path.join(ciDir, "coverage-audit.json"),
    JSON.stringify(summary, null, 2),
  );

  const human = `${table}\n\nMissing packages: ${
    missing.join(", ") || "none"
  }\nDisabled items: ${disabled.join(", ") || "none"}\nMissing required checks: ${
    requiredMissing.join(", ") || "none"
  }\n`;
  console.log(human);
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, human);
  }

  if (missing.length || disabled.length) {
    process.exit(1);
  }
}

main();
