import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { audit } from '../../../scripts/ci-guard/cf-pages-build/audit';

function tmpFile(name: string, content: string): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'cf-'));
  const file = path.join(dir, name);
  writeFileSync(file, content);
  return file;
}

function goodWrangler(cmd?: string): string {
  const command =
    cmd ||
    'corepack enable && pnpm -C frontend install && pnpm -C frontend build';
  return tmpFile(
    'wrangler.toml',
    `[build]\ncommand = "${command}"\n[pages]\nbuild_output_dir = "frontend/dist"\n`,
  );
}

function goodWorkflow(runsOn = 'ubuntu-latest'): string {
  return tmpFile(
    'wf.yml',
    `jobs:\n  build:\n    runs-on: ${runsOn}\n    steps:\n      - run: test -f frontend/dist/index.html\n`,
  );
}

describe('cf pages build audit', () => {
  test('t1 missing build command fails', () => {
    const w = tmpFile('wrangler.toml', `[pages]\nbuild_output_dir = "frontend/dist"\n`);
    const wf = goodWorkflow();
    const res = audit(w, [wf]);
    expect(res.ok).toBe(false);
  });
  test('t2 missing build_output_dir fails', () => {
    const w = tmpFile(
      'wrangler.toml',
      `[build]\ncommand = "corepack enable && pnpm -C frontend install && pnpm -C frontend build"\n`,
    );
    const wf = goodWorkflow();
    const res = audit(w, [wf]);
    expect(res.ok).toBe(false);
  });
  test('t3 command without corepack fails', () => {
    const w = goodWrangler('pnpm -C frontend install && pnpm -C frontend build');
    const wf = goodWorkflow();
    const res = audit(w, [wf]);
    expect(res.ok).toBe(false);
  });
  test('t4 command without install fails', () => {
    const w = goodWrangler('corepack enable && pnpm -C frontend build');
    const wf = goodWorkflow();
    const res = audit(w, [wf]);
    expect(res.ok).toBe(false);
  });
  test('t5 command without build fails', () => {
    const w = goodWrangler('corepack enable && pnpm -C frontend install');
    const wf = goodWorkflow();
    const res = audit(w, [wf]);
    expect(res.ok).toBe(false);
  });
  test('t6 wrong build_output_dir fails', () => {
    const w = tmpFile(
      'wrangler.toml',
      `[build]\ncommand = "corepack enable && pnpm -C frontend install && pnpm -C frontend build"\n[pages]\nbuild_output_dir = "out"\n`,
    );
    const wf = goodWorkflow();
    const res = audit(w, [wf]);
    expect(res.ok).toBe(false);
  });
  test('t7 workflow verify step present passes', () => {
    const w = goodWrangler();
    const wf = goodWorkflow();
    const res = audit(w, [wf]);
    expect(res.ok).toBe(true);
  });
  test('t8 workflow missing verify fails', () => {
    const w = goodWrangler();
    const wf = tmpFile('wf.yml', `jobs:\n  build:\n    steps:\n      - run: echo none\n`);
    const res = audit(w, [wf]);
    expect(res.ok).toBe(false);
  });
  test('t9 macOS runner passes', () => {
    const w = goodWrangler();
    const wf = goodWorkflow('macos-latest');
    const res = audit(w, [wf]);
    expect(res.ok).toBe(true);
  });
  test('t10 bad quoting still passes', () => {
    const w = goodWrangler(
      'bash -lc corepack enable && pnpm -C frontend install && pnpm -C frontend build',
    );
    const wf = goodWorkflow();
    const res = audit(w, [wf]);
    expect(res.ok).toBe(true);
  });
  test('t11 extra keys pass', () => {
    const w = tmpFile(
      'wrangler.toml',
      `[extra]\nfoo = "bar"\n[build]\ncommand = "corepack enable && pnpm -C frontend install && pnpm -C frontend build"\n[pages]\nbuild_output_dir = "frontend/dist"\n`,
    );
    const wf = goodWorkflow();
    const res = audit(w, [wf]);
    expect(res.ok).toBe(true);
  });
  test('t12 summary includes line numbers', () => {
    const w = goodWrangler();
    const wf = goodWorkflow();
    const res = audit(w, [wf]);
    expect(res.wrangler.buildCommand.line).toBeGreaterThan(0);
    const wfEntry = res.workflows[wf];
    expect(wfEntry.verify.line).toBeGreaterThan(0);
  });
});
