#!/usr/bin/env node
// @ts-check
const fs = require('fs');
const path = require('path');
const toml = require('toml');
const yaml = require('yaml');
const { spawnSync } = require('child_process');

function findLine(content, search) {
  const lines = content.split(/\r?\n/);
  const idx = lines.findIndex((l) => l.includes(search));
  return idx === -1 ? null : idx + 1;
}

/**
 * @param {string} wranglerPath
 * @param {string[]} workflowFiles
 */
function audit(wranglerPath, workflowFiles) {
  const summary = {
    ok: true,
    wrangler: { file: wranglerPath },
    workflows: {},
  };
  const wContent = fs.readFileSync(wranglerPath, 'utf8');
  const wDoc = toml.parse(wContent);
  const buildCmd = wDoc.build && wDoc.build.command;
  const buildCmdLine = findLine(wContent, 'command');
  summary.wrangler.buildCommand = { ok: !!buildCmd, line: buildCmdLine, command: buildCmd || null, errors: [] };
  if (!buildCmd) summary.ok = false;
  const outDir = wDoc.pages && wDoc.pages.build_output_dir;
  const outDirLine = findLine(wContent, 'build_output_dir');
  summary.wrangler.buildOutputDir = { ok: !!outDir, line: outDirLine, value: outDir || null, errors: [] };
  if (!outDir) summary.ok = false; else if (outDir !== 'frontend/dist') {
    summary.wrangler.buildOutputDir.ok = false;
    summary.wrangler.buildOutputDir.errors.push('must be frontend/dist');
    summary.ok = false;
  }
  if (buildCmd) {
    if (!/corepack\s+enable/.test(buildCmd)) {
      summary.wrangler.buildCommand.ok = false;
      summary.wrangler.buildCommand.errors.push('missing corepack enable');
      summary.ok = false;
    }
    if (!/pnpm\s+-C\s+frontend\s+install/.test(buildCmd)) {
      summary.wrangler.buildCommand.ok = false;
      summary.wrangler.buildCommand.errors.push('missing pnpm -C frontend install');
      summary.ok = false;
    }
    if (!/pnpm\s+-C\s+frontend\s+build/.test(buildCmd)) {
      summary.wrangler.buildCommand.ok = false;
      summary.wrangler.buildCommand.errors.push('missing pnpm -C frontend build');
      summary.ok = false;
    }
    const dryRunScript = [
      'bash() { echo bash "$@"; }',
      'corepack() { echo corepack "$@"; }',
      'pnpm() { echo pnpm "$@"; }',
      buildCmd,
    ].join('\n');
    const proc = spawnSync('bash', ['-lc', dryRunScript], { encoding: 'utf8' });
    const output = (proc.stdout || '') + (proc.stderr || '');
    summary.wrangler.dryRun = { output };
    if (!output.includes('corepack') || !output.includes('pnpm -C frontend build')) {
      summary.wrangler.buildCommand.ok = false;
      summary.wrangler.buildCommand.errors.push('dry-run missing expected output');
      summary.ok = false;
    }
  }
  for (const file of workflowFiles) {
    const wfContent = fs.readFileSync(file, 'utf8');
    const wfLines = wfContent.split(/\r?\n/);
    const verifyIdx = wfLines.findIndex((l) => l.includes('test -f frontend/dist/index.html'));
    const wfSummary = {
      file,
      verify: { ok: verifyIdx !== -1, line: verifyIdx === -1 ? null : verifyIdx + 1 },
    };
    if (verifyIdx === -1) summary.ok = false;
    summary.workflows[file] = wfSummary;
  }
  return summary;
}

function main() {
  const repoRoot = process.cwd();
  const wranglerPath = path.join(repoRoot, 'wrangler.toml');
  const wfDir = path.join(repoRoot, '.github', 'workflows');
  const workflowFiles = fs
    .readdirSync(wfDir)
    .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
    .map((f) => path.join(wfDir, f));
  const summary = audit(wranglerPath, workflowFiles);
  fs.writeFileSync('cf-pages-build-audit-summary.json', JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.ok) process.exit(1);
}

if (require.main === module) {
  main();
}

module.exports = { audit };
