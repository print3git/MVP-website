import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { describe, expect, test } from 'vitest';
import { scanWorkflows } from '../../scripts/ci/diag-usage-audit';

const fixtures = path.resolve(__dirname, '__fixtures__', 'diag-usage-audit');

describe('diag-audit', () => {
  test('flags inline diagnostics', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'diag-'));
    const wfDir = path.join(tmp, '.github', 'workflows');
    fs.mkdirSync(wfDir, { recursive: true });
    const bad = fs.readFileSync(path.join(fixtures, 'bad.yml'), 'utf8');
    fs.writeFileSync(path.join(wfDir, 'bad.yml'), bad);
    const offenders = scanWorkflows(tmp);
    expect(offenders.length).toBe(1);
    expect(offenders[0]).toMatch(/bad.yml:4/);
  });

  test('passes when no inline diagnostics', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'diag-'));
    const wfDir = path.join(tmp, '.github', 'workflows');
    fs.mkdirSync(wfDir, { recursive: true });
    const good = fs.readFileSync(path.join(fixtures, 'good.yml'), 'utf8');
    fs.writeFileSync(path.join(wfDir, 'good.yml'), good);
    const offenders = scanWorkflows(tmp);
    expect(offenders).toHaveLength(0);
  });
});
