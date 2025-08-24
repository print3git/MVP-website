#!/usr/bin/env node
// @ts-check
const fs = require('fs');
const path = require('path');

function auditRepo(root = process.cwd()) {
  const summary = { ok: true, files: {} };

  const wranglerPath = path.join(root, 'wrangler.toml');
  const workflowPath = path.join(root, '.github', 'workflows', 'pages-deploy.yml');

  const wSummary = { ok: true, errors: [] };
  try {
    const content = fs.readFileSync(wranglerPath, 'utf8');
    if (!content.includes('BEGIN MANAGED BLOCK: ci-guard:cf-pages-build') ||
        !content.includes('END MANAGED BLOCK: ci-guard:cf-pages-build')) {
      wSummary.ok = false;
      wSummary.errors.push('missing managed block');
    }
    if (!/\[build\][\s\S]*command\s*=\s*"bash -lc 'corepack enable && pnpm -C frontend install --frozen-lockfile && pnpm -C frontend build'"/.test(content)) {
      wSummary.ok = false;
      wSummary.errors.push('missing build command');
    }
    if (!/\[pages\][\s\S]*build_output_dir\s*=\s*"frontend\/dist"/.test(content)) {
      wSummary.ok = false;
      wSummary.errors.push('missing pages build_output_dir');
    }
  } catch (err) {
    wSummary.ok = false;
    wSummary.errors.push(String(err));
  }
  summary.files[wranglerPath] = wSummary;
  if (!wSummary.ok) summary.ok = false;

  const wfSummary = { ok: true, errors: [] };
  try {
    const content = fs.readFileSync(workflowPath, 'utf8');
    if (!content.includes('BEGIN MANAGED BLOCK: ci-guard:cf-pages-build') ||
        !content.includes('END MANAGED BLOCK: ci-guard:cf-pages-build')) {
      wfSummary.ok = false;
      wfSummary.errors.push('missing managed block');
    }
    if (!content.includes('pnpm -C frontend install --frozen-lockfile && pnpm -C frontend build')) {
      wfSummary.ok = false;
      wfSummary.errors.push('missing build step');
    }
    if (!content.includes('test -f frontend/dist/index.html')) {
      wfSummary.ok = false;
      wfSummary.errors.push('missing verify step');
    }
    if (!content.includes('cloudflare/wrangler-action@v3')) {
      wfSummary.ok = false;
      wfSummary.errors.push('missing wrangler action');
    }
  } catch (err) {
    wfSummary.ok = false;
    wfSummary.errors.push(String(err));
  }
  summary.files[workflowPath] = wfSummary;
  if (!wfSummary.ok) summary.ok = false;

  return summary;
}

function main() {
  const summary = auditRepo();
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.ok) process.exit(1);
}

if (require.main === module) {
  main();
}

module.exports = { auditRepo };
