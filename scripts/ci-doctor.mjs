#!/usr/bin/env node
import { existsSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

/** Collect check results */
const checks = [];

function add(check, ok, info = '') {
  checks.push({ check, ok, info });
}

function checkPath(label, p) {
  const exists = existsSync(p);
  add(`path:${label}`, exists, exists ? p : 'missing');
  return exists;
}

function checkEnv(name) {
  const val = process.env[name];
  const ok = !!val;
  add(`env:${name}`, ok, ok ? '[set]' : 'missing');
  return ok;
}

function checkTool(name, cmd) {
  try {
    const out = execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'] })
      .toString()
      .trim();
    add(`tool:${name}`, true, out);
  } catch {
    add(`tool:${name}`, false, 'missing');
  }
}

// Paths
checkPath('backend/package.json', 'backend/package.json');
checkPath('frontend/package.json', 'frontend/package.json');
checkPath('wrangler.toml', 'wrangler.toml');
const distExists = checkPath('frontend/dist', 'frontend/dist');
if (distExists) {
  const modelsDir = path.join('frontend', 'dist', 'models');
  let modelFile = 'missing';
  try {
    const files = readdirSync(modelsDir);
    if (files.length > 0) {
      modelFile = path.join(modelsDir, files[0]);
    }
  } catch {
    // ignore
  }
  add('path:frontend/dist/models', modelFile !== 'missing', modelFile);
} else {
  add('path:frontend/dist/models', false, 'missing');
}

// Env vars
checkEnv('STRIPE_SECRET_KEY');
checkEnv('STRIPE_WEBHOOK_SECRET');
const dbUrl = process.env.DB_URL || process.env.TEST_DB_URL || process.env.DATABASE_URL;
add('env:DB_URL', !!dbUrl, dbUrl ? '[set]' : 'missing');

// Tooling
checkTool('node', 'node -v');
checkTool('npm', 'npm -v');
if (process.env.SKIP_PW_DEPS === '1') {
  add('tool:playwright', true, 'skipped');
} else {
  checkTool('playwright', 'npx --no-install playwright --version');
}

// Output table and exit appropriately
console.table(
  checks.map((c) => ({ Check: c.check, Status: c.ok ? 'ok' : 'missing', Info: c.info }))
);

process.exit(checks.every((c) => c.ok) ? 0 : 1);
