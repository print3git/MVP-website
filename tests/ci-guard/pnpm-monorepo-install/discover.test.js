const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const assert = require('assert');

const repoRoot = path.resolve(__dirname, '../../..');
const script = path.join(repoRoot, 'scripts/ci-guard/pnpm-monorepo-install/discover.sh');

function makeRepo(structure) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-'));
  for (const [p, content] of Object.entries(structure)) {
    const full = path.join(dir, p);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  const binDir = path.join(dir, 'bin');
  fs.mkdirSync(binDir);
  const log = path.join(dir, 'pnpm.log');
  fs.writeFileSync(path.join(binDir, 'pnpm'), `#!/usr/bin/env bash\necho "$PWD" >> "${log}"\n`);
  fs.chmodSync(path.join(binDir, 'pnpm'), 0o755);
  return { dir, binDir, log };
}

function run(structure, expectedDirs, expectedStatus = 0) {
  const { dir, binDir, log } = makeRepo(structure);
  const env = { ...process.env, PATH: `${binDir}:${process.env.PATH}` };
  const res = spawnSync('bash', [script], { cwd: dir, env, encoding: 'utf8' });
  assert.strictEqual(res.status, expectedStatus, res.stderr);
  if (expectedStatus === 0) {
    const called = fs.readFileSync(log, 'utf8').trim().split('\n').map(p => {
      const rel = path.relative(dir, p);
      return rel === '' ? '.' : rel;
    });
    assert.deepStrictEqual(called.sort(), expectedDirs.sort());
  }
  fs.rmSync(dir, { recursive: true, force: true });
}

run({ 'package.json': '{}' }, ['.']);
run({ 'frontend/package.json': '{}', 'backend/package.json': '{}' }, ['frontend', 'backend']);
run({}, [], 2);
