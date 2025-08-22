#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

function parseJsonWithErrors(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  try {
    return { data: JSON.parse(src), src };
  } catch (err) {
    const m = /position (\d+)/.exec(err.message);
    if (m) {
      const pos = Number(m[1]);
      const lines = src.slice(0, pos).split(/\n/);
      const line = lines.length;
      const col = lines[lines.length - 1].length + 1;
      err.message = `JSON parse error at ${line}:${col} - ${err.message}`;
    }
    throw err;
  }
}

function collectWorkflowScripts(dir) {
  const scripts = new Set();
  if (!fs.existsSync(dir)) return scripts;
  const runRe = /\b(?:npm|pnpm)\s+run\s+([\w:-]+)/g;
  for (const file of fs.readdirSync(dir)) {
    const full = path.join(dir, file);
    if (fs.statSync(full).isFile()) {
      const txt = fs.readFileSync(full, 'utf8');
      let m;
      while ((m = runRe.exec(txt))) {
        const name = m[1];
        if (!name.startsWith('-')) scripts.add(name);
      }
    }
  }
  return scripts;
}

function validate(pkgPath, workflowsDir = path.resolve(process.cwd(), '.github', 'workflows')) {
  const errors = [];
  const warnings = [];
  let pkg;
  try {
    const { data } = parseJsonWithErrors(pkgPath);
    pkg = data;
  } catch (err) {
    errors.push(err.message);
    return { errors, warnings };
  }

  if (typeof pkg.name !== 'string') errors.push('package.json missing required string field "name"');
  if (typeof pkg.private !== 'boolean') errors.push('package.json missing required boolean field "private"');
  if (!pkg.scripts || typeof pkg.scripts !== 'object') errors.push('package.json missing required object field "scripts"');

  if (pkg.version && typeof pkg.version !== 'string') errors.push('package.json optional field "version" must be string');
  if (pkg.packageManager && typeof pkg.packageManager !== 'string') errors.push('package.json optional field "packageManager" must be string');
  if (pkg.workspaces && !Array.isArray(pkg.workspaces)) errors.push('package.json optional field "workspaces" must be array of strings');

  const referenced = collectWorkflowScripts(workflowsDir);
  const missing = Array.from(referenced).filter((s) => !pkg.scripts || !(s in pkg.scripts));
  if (missing.length) warnings.push(`Missing scripts referenced in workflows: ${missing.join(', ')}`);

  return { errors, warnings };
}

if (require.main === module) {
  const pkgPath = path.resolve(process.cwd(), 'package.json');
  const res = validate(pkgPath);
  if (res.errors.length) {
    for (const e of res.errors) console.error(e);
    process.exit(1);
  }
  for (const w of res.warnings) console.warn('WARN:', w);
}

module.exports = { validate };
