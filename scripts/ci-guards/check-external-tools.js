#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
let yaml;
try {
  yaml = require('yaml');
} catch {
  console.error('yaml module is required');
  process.exit(1);
}

const TOOL_PATTERNS = [
  { name: 'rg', regex: /\brg\b/ },
  { name: 'yq', regex: /\byq\b/ },
  { name: 'jq', regex: /\bjq\b/ },
  { name: 'enhanced-grep', regex: /\benhanced-grep\b/ },
  { name: 'netstat', regex: /\bnetstat\b/ },
  { name: 'lsb_release', regex: /\blsb_release\b/ },
  { name: 'xmlstarlet', regex: /\bxmlstarlet\b/ },
  { name: 'envsubst', regex: /\benvsubst\b/ },
  { name: 'gsed', regex: /\bgsed\b/ },
  { name: 'gawk', regex: /\bgawk\b/ },
  { name: 'wget', regex: /\bwget\b/ },
  { name: 'zip', regex: /\bzip\b/ },
  { name: 'unzip', regex: /\bunzip\b/ },
];

const WARN_TOOLS = new Set(['gsed','gawk','netstat','wget']);
const INSTALL_NAMES = {
  rg: ['ripgrep', 'rg'],
  yq: ['yq'],
  jq: ['jq'],
  'enhanced-grep': ['enhanced-grep'],
  netstat: ['netstat'],
  lsb_release: ['lsb-release', 'lsb_release'],
  xmlstarlet: ['xmlstarlet'],
  envsubst: ['envsubst', 'gettext-base'],
  gsed: ['gsed', 'gnu-sed'],
  gawk: ['gawk'],
  wget: ['wget'],
  zip: ['zip'],
  unzip: ['unzip'],
};

function listYamlFiles(start, filter) {
  const out = [];
  if (!fs.existsSync(start)) return out;
  const entries = fs.readdirSync(start, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const full = path.join(start, e.name);
    if (e.isDirectory()) out.push(...listYamlFiles(full, filter));
    else if (filter(full)) out.push(full);
  }
  return out;
}

function stripComments(run) {
  return run
    .split('\n')
    .map((l) => l.replace(/#.*$/, ''))
    .join('\n');
}

function isInstalled(script, tool) {
  const names = INSTALL_NAMES[tool] || [tool];
  const patterns = names.map(
    (n) =>
      new RegExp(
        `(?:apt(-get)?|aptitude|yum|dnf|brew|choco|pip|npm|apk)\\s+[\\w-]*?install[^\n]*\\b${n}\\b`
      )
  );
  return patterns.some((rx) => rx.test(script));
}

function baselineWarn(os, tool) {
  if (!os) return false;
  const text = Array.isArray(os) ? os.join(' ') : String(os);
  if (/ubuntu/i.test(text) && tool === 'jq') return true;
  return false;
}

function analyzeSteps(steps, os, file, jobName) {
  const installed = new Set();
  const results = [];
  if (!Array.isArray(steps)) return results;
  steps.forEach((step, idx) => {
    const run = typeof step.run === 'string' ? stripComments(step.run) : '';
    for (const t of TOOL_PATTERNS) {
      if (run && isInstalled(run, t.name)) installed.add(t.name);
    }
    for (const t of TOOL_PATTERNS) {
      if (run && t.regex.test(run)) {
        const hasInstall = installed.has(t.name);
        let status = 'error';
        if (hasInstall) status = 'ok';
        else if (WARN_TOOLS.has(t.name) || baselineWarn(os, t.name)) status = 'warn';
        const stepName = step.name || `step${idx + 1}`;
        results.push({
          file,
          job: jobName,
          step: stepName,
          tool: t.name,
          status,
        });
      }
    }
  });
  return results;
}

function analyzeWorkflow(file) {
  const doc = yaml.parse(fs.readFileSync(file, 'utf8')) || {};
  const jobs = doc.jobs || {};
  const results = [];
  for (const [jobName, job] of Object.entries(jobs)) {
    const os = job['runs-on'];
    results.push(...analyzeSteps(job.steps || [], os, path.relative(process.cwd(), file), jobName));
  }
  return results;
}

function analyzeAction(file) {
  const doc = yaml.parse(fs.readFileSync(file, 'utf8')) || {};
  const runs = doc.runs || {};
  const steps = runs.steps || [];
  return analyzeSteps(steps, null, path.relative(process.cwd(), file), path.basename(path.dirname(file)));
}

function main() {
  const root = process.cwd();
  const workflowFiles = listYamlFiles(path.join(root, '.github', 'workflows'), (f) => f.endsWith('.yml'));
  const actionFiles = listYamlFiles(path.join(root, '.github', 'actions'), (f) => /action\.yml$/.test(f));
  const all = [];
  for (const f of workflowFiles) all.push(...analyzeWorkflow(f));
  for (const f of actionFiles) all.push(...analyzeAction(f));

  const lines = ['| File | Job/Action | Step | Tool | Result |', '| ---- | ---------- | ---- | ---- | ------ |'];
  let hasError = false;
  for (const r of all) {
    const sym = r.status === 'ok' ? '✅' : r.status === 'warn' ? '⚠️' : '❌';
    if (r.status === 'error') hasError = true;
    lines.push(`| ${r.file} | ${r.job} | ${r.step} | ${r.tool} | ${sym} |`);
  }
  console.log(lines.join('\n'));

  const outPath = path.join(root, 'ci', 'guards');
  fs.mkdirSync(outPath, { recursive: true });
  fs.writeFileSync(path.join(outPath, 'external-tools-report.json'), JSON.stringify({ results: all }, null, 2));
  if (hasError) process.exitCode = 1;
}

main();
