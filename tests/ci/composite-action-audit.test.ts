import { describe, it, expect } from 'vitest';
import { auditCompositeActions } from '../../scripts/ci/composite-action-audit';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync } from 'fs';
import path from 'path';
import os from 'os';

function tempDir() {
  return mkdtempSync(path.join(os.tmpdir(), 'audit-'));
}

function writeAction(root: string, name: string, content: string) {
  const file = path.join(root, '.github', 'actions', name, 'action.yml');
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
  return file;
}

describe('composite-action-audit', () => {
  it('valid minimal composite action passes and writes summary', async () => {
    const dir = tempDir();
    writeAction(
      dir,
      'ok',
      `name: test\ndescription: test\nruns:\n  using: composite\n  steps:\n    - run: echo hi\n      shell: bash\n`
    );
    const summary = await auditCompositeActions(dir, { summaryFile: 'out.json' });
    expect(summary.ok).toBe(true);
    const stored = JSON.parse(readFileSync(path.join(dir, 'out.json'), 'utf8'));
    expect(stored).toHaveProperty('actions');
    expect(stored.actions[0].errors).toHaveLength(0);
  });

  it('missing colon in a mapping fails with line pointer', async () => {
    const dir = tempDir();
    writeAction(
      dir,
      'bad',
      `name: test\ndescription test\n`
    );
    const summary = await auditCompositeActions(dir);
    expect(summary.ok).toBe(false);
    expect(summary.actions[0].errors[0].line).toBe(3);
  });

  it('step with both uses and run fails', async () => {
    const dir = tempDir();
    writeAction(
      dir,
      'mix',
      `name: t\ndescription: t\nruns:\n  using: composite\n  steps:\n    - uses: actions/checkout@v4\n      run: echo hi\n      shell: bash\n`
    );
    const summary = await auditCompositeActions(dir);
    expect(summary.ok).toBe(false);
  });

  it('run step missing shell fails', async () => {
    const dir = tempDir();
    writeAction(
      dir,
      'noshell',
      `name: t\ndescription: t\nruns:\n  using: composite\n  steps:\n    - run: echo hi\n`
    );
    const summary = await auditCompositeActions(dir);
    expect(summary.ok).toBe(false);
  });

  it('runs.using not composite fails', async () => {
    const dir = tempDir();
    writeAction(
      dir,
      'run',
      `name: t\ndescription: t\nruns:\n  using: node12\n  steps: []\n`
    );
    const summary = await auditCompositeActions(dir);
    expect(summary.ok).toBe(false);
  });

  it('missing runs.steps array fails', async () => {
    const dir = tempDir();
    writeAction(
      dir,
      'nosteps',
      `name: t\ndescription: t\nruns:\n  using: composite\n`
    );
    const summary = await auditCompositeActions(dir);
    expect(summary.ok).toBe(false);
  });

  it('github-script step with script but no with block fails', async () => {
    const dir = tempDir();
    writeAction(
      dir,
      'ghscript',
      `name: t\ndescription: t\nruns:\n  using: composite\n  steps:\n    - uses: actions/github-script@v6\n      script: return 1\n`
    );
    const summary = await auditCompositeActions(dir);
    expect(summary.ok).toBe(false);
  });

  it('duplicate top-level key fails', async () => {
    const dir = tempDir();
    writeAction(
      dir,
      'dup',
      `name: t\ndescription: t\nruns:\n  using: composite\n  steps: []\nruns:\n  using: composite\n  steps: []\n`
    );
    const summary = await auditCompositeActions(dir);
    expect(summary.ok).toBe(false);
  });

  it('unknown top-level keys produce warnings', async () => {
    const dir = tempDir();
    writeAction(
      dir,
      'warn',
      `name: t\ndescription: t\nfoo: bar\nruns:\n  using: composite\n  steps: []\n`
    );
    const summary = await auditCompositeActions(dir);
    expect(summary.ok).toBe(true);
    expect(summary.actions[0].warnings).toHaveLength(1);
  });

  it('warnings fail when strict option enabled', async () => {
    const dir = tempDir();
    writeAction(
      dir,
      'warn',
      `name: t\ndescription: t\nfoo: bar\nruns:\n  using: composite\n  steps: []\n`
    );
    const summary = await auditCompositeActions(dir, { strict: true });
    expect(summary.ok).toBe(false);
  });

  it('embedded expressions as strings are allowed', async () => {
    const dir = tempDir();
    writeAction(
      dir,
      'expr',
      `name: t\ndescription: t\nruns:\n  using: composite\n  steps:\n    - uses: actions/checkout@v4\n      with:\n        path: "\${{ github.workspace }}"\n`
    );
    const summary = await auditCompositeActions(dir);
    expect(summary.ok).toBe(true);
  });

  it('yaml anchors and aliases are allowed', async () => {
    const dir = tempDir();
    writeAction(
      dir,
      'anchor',
      `name: t\ndescription: t\nruns:\n  using: composite\n  steps:\n    - &step\n      run: echo hi\n      shell: bash\n    - *step\n`
    );
    const summary = await auditCompositeActions(dir);
    expect(summary.ok).toBe(true);
  });

  it('multi-file scan reports all paths and fails when one invalid', async () => {
    const dir = tempDir();
    writeAction(
      dir,
      'good',
      `name: t\ndescription: t\nruns:\n  using: composite\n  steps:\n    - run: echo hi\n      shell: bash\n`
    );
    writeAction(
      dir,
      'bad',
      `name: t\ndescription: t\nruns:\n  using: composite\n  steps:\n    - run: echo hi\n`
    );
    const summary = await auditCompositeActions(dir);
    expect(summary.ok).toBe(false);
    expect(summary.actions).toHaveLength(2);
  });
});

