const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const test = require('node:test');
const assert = require('assert');

const script = path.resolve(__dirname, '../../scripts/ci-guards/check-external-tools.js');

function runGuard(opts) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ext-guard-'));
  if (opts.workflows) {
    for (const [name, content] of Object.entries(opts.workflows)) {
      const p = path.join(dir, '.github/workflows', name);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, content);
    }
  }
  if (opts.actions) {
    for (const [name, content] of Object.entries(opts.actions)) {
      const p = path.join(dir, '.github/actions', name);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, content);
    }
  }
  let code = 0;
  try {
    execFileSync('node', [script], { cwd: dir, stdio: 'pipe' });
  } catch (e) {
    code = e.status || 1;
  }
  const reportPath = path.join(dir, 'ci/guards/external-tools-report.json');
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  return { code, results: report.results };
}

test('rg without install -> error', () => {
    const yaml = [
      'name: t',
      'jobs:',
      '  a:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - run: rg foo',
    ].join('\n');
    const r = runGuard({ workflows: { 'test.yml': yaml } });
    assert.equal(r.code, 1);
    assert.equal(r.results[0].status, 'error');
});

test('rg with install -> ok', () => {
    const yaml = [
      'name: t',
      'jobs:',
      '  a:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - run: apt-get install -y ripgrep',
      '      - run: rg foo',
    ].join('\n');
    const r = runGuard({ workflows: { 'test.yml': yaml } });
    assert.equal(r.code, 0);
    assert.equal(r.results[0].status, 'ok');
});

test('jq without install on ubuntu -> warn', () => {
    const yaml = [
      'name: t',
      'jobs:',
      '  a:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - run: jq .foo file.json',
    ].join('\n');
    const r = runGuard({ workflows: { 'test.yml': yaml } });
    assert.equal(r.code, 0);
    assert.equal(r.results[0].status, 'warn');
});

test('jq with install -> ok', () => {
    const yaml = [
      'name: t',
      'jobs:',
      '  a:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - run: apt-get install -y jq',
      '      - run: jq .foo file.json',
    ].join('\n');
    const r = runGuard({ workflows: { 'test.yml': yaml } });
    assert.equal(r.code, 0);
    assert.equal(r.results[1].status, 'ok');
});

test('yq with pip install -> ok', () => {
    const yaml = [
      'name: t',
      'jobs:',
      '  a:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - run: pip install yq',
      '      - run: yq .a b.yml',
    ].join('\n');
    const r = runGuard({ workflows: { 'test.yml': yaml } });
    assert.equal(r.code, 0);
    assert.equal(r.results[1].status, 'ok');
});

test('envsubst without install -> error', () => {
    const yaml = [
      'name: t',
      'jobs:',
      '  a:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - run: envsubst < in > out',
    ].join('\n');
    const r = runGuard({ workflows: { 'test.yml': yaml } });
    assert.equal(r.code, 1);
    assert.equal(r.results[0].tool, 'envsubst');
    assert.equal(r.results[0].status, 'error');
});

test('composite action using yq -> error', () => {
    const action = [
      'runs:',
      '  using: composite',
      '  steps:',
      '    - run: yq .a b.yml',
    ].join('\n');
    const r = runGuard({ actions: { 'act/action.yml': action } });
    assert.equal(r.code, 1);
    assert.equal(r.results[0].tool, 'yq');
    assert.equal(r.results[0].status, 'error');
});

test('macos gsed without install -> warn', () => {
    const yaml = [
      'name: t',
      'jobs:',
      '  a:',
      '    runs-on: macos-latest',
      '    steps:',
      "      - run: gsed -i '' 's/a/b/' file",
    ].join('\n');
    const r = runGuard({ workflows: { 'test.yml': yaml } });
    assert.equal(r.code, 0);
    assert.equal(r.results[0].status, 'warn');
});

test('windows wget without install -> warn', () => {
    const yaml = [
      'name: t',
      'jobs:',
      '  a:',
      '    runs-on: windows-latest',
      '    steps:',
      '      - run: wget http://example.com',
    ].join('\n');
    const r = runGuard({ workflows: { 'test.yml': yaml } });
    assert.equal(r.code, 0);
    assert.equal(r.results[0].status, 'warn');
});

test('node fallback script -> pass', () => {
    const yaml = [
      'name: t',
      'jobs:',
      '  a:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - run: node scripts/ci-tools/scan-workflows.js',
    ].join('\n');
    const r = runGuard({ workflows: { 'test.yml': yaml } });
    assert.equal(r.code, 0);
    assert.equal(r.results.length, 0);
});

test('matrix with conditional install -> ok', () => {
    const yaml = [
      'name: t',
      'jobs:',
      '  a:',
      '    runs-on: ${{ matrix.os }}',
      '    strategy:',
      '      matrix:',
      '        os: [ubuntu-latest, macos-latest]',
      '    steps:',
      '      - run: |',
      '          if [ "$RUNNER_OS" = "Linux" ]; then sudo apt-get install -y yq; fi',
      '          if [ "$RUNNER_OS" = "macOS" ]; then brew install yq; fi',
      '      - run: yq .a b.yml',
    ].join('\n');
    const r = runGuard({ workflows: { 'test.yml': yaml } });
    assert.equal(r.code, 0);
    assert.equal(r.results[1].status, 'ok');
});

test('comments ignored', () => {
  const yaml = [
    'name: t',
    'jobs:',
    '  a:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - run: |',
    '          # rg command commented',
    '          echo done',
  ].join('\n');
  const r = runGuard({ workflows: { 'test.yml': yaml } });
  assert.equal(r.code, 0);
  assert.equal(r.results.length, 0);
});
