const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const script = path.resolve(__dirname, '../../../scripts/ci-guard/single-lockfile-policy/index.js');

describe('single-lockfile-policy script', () => {
  function runInDir(setup) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slp-'));
    try {
      setup(dir);
      const result = spawnSync('node', [script], { cwd: dir });
      return { status: result.status, stderr: result.stderr.toString() };
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  test('fails when root package-lock.json exists', () => {
    const { status, stderr } = runInDir(dir => {
      fs.writeFileSync(path.join(dir, 'package-lock.json'), '{}');
    });
    expect(status).toBe(1);
    expect(stderr).toMatch(/package-lock.json found at repo root/);
  });

  test('warns when nested package-lock.json exists', () => {
    const { status, stderr } = runInDir(dir => {
      fs.mkdirSync(path.join(dir, 'nested'));
      fs.writeFileSync(path.join(dir, 'nested', 'package-lock.json'), '{}');
    });
    expect(status).toBe(0);
    expect(stderr).toMatch(/Nested package-lock.json files detected/);
  });

  test('passes when no package-lock.json exists', () => {
    const { status, stderr } = runInDir(() => {});
    expect(status).toBe(0);
    expect(stderr).toBe('');
  });
});
