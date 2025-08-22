const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const script = path.resolve(__dirname, '../../../scripts/ci-guard/pkgjson-repair/validate.ts');

function run(cwd) {
  return spawnSync('node', [script], { cwd, encoding: 'utf8' });
}

test('valid package.json passes', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pkg-'));
  const pkg = { name: 'demo', private: true, scripts: { build: 'echo ok' }, workspaces: ['a'] };
  fs.mkdirSync(path.join(dir, '.github', 'workflows'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.github', 'workflows', 'w.yml'), 'run: npm run build');
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg));
  const res = run(dir);
  if (res.status !== 0) throw new Error(res.stdout + res.stderr);
});

test('invalid json reports location', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pkg-'));
  fs.writeFileSync(path.join(dir, 'package.json'), '{ "name": "x"');
  const res = run(dir);
  if (res.status === 0) throw new Error('expected failure');
});

test('missing scripts trigger warning', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pkg-'));
  const pkg = { name: 'demo', private: true, scripts: {} };
  fs.mkdirSync(path.join(dir, '.github', 'workflows'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.github', 'workflows', 'w.yml'), 'run: npm run missing');
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg));
  const res = run(dir);
  if (res.status !== 0) throw new Error(res.stdout + res.stderr);
  if (!/Missing scripts/.test(res.stdout) && !/Missing scripts/.test(res.stderr)) {
    throw new Error('expected warning');
  }
});
