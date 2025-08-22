import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { auditFiles } from '../../../scripts/ci-guard/frontend-smoke-artifact/audit';

function wf(content: string): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'wf-'));
  const file = path.join(dir, 'flow.yml');
  writeFileSync(file, content);
  return file;
}

describe('frontend smoke artifact audit', () => {
  test('t1 build and verify pass', () => {
    const file = wf(`jobs:\n  smoke:\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n          cache: pnpm\n      - run: corepack enable\n      - uses: pnpm/action-setup@v4\n      - run: pnpm build\n        working-directory: frontend\n      - run: test -f frontend/dist/index.html\n        working-directory: frontend\n      - run: cat frontend/dist/index.html\n`);
    const res = auditFiles([file]);
    expect(res.ok).toBe(true);
  });

  test('t2 download artifact pass', () => {
    const file = wf(`jobs:\n  smoke:\n    steps:\n      - uses: actions/download-artifact@v4\n        with:\n          name: frontend-dist\n          path: frontend/dist\n      - run: ls frontend/dist\n`);
    const res = auditFiles([file]);
    expect(res.ok).toBe(true);
  });

  test('t3 missing build and download fail', () => {
    const file = wf(`jobs:\n  smoke:\n    steps:\n      - run: echo none\n      - run: ls frontend/dist\n`);
    const res = auditFiles([file]);
    expect(res.ok).toBe(false);
  });

  test('t4 wrong artifact name fail', () => {
    const file = wf(`jobs:\n  smoke:\n    steps:\n      - uses: actions/download-artifact@v4\n        with:\n          name: wrong\n          path: frontend/dist\n      - run: ls frontend/dist\n`);
    const res = auditFiles([file]);
    expect(res.ok).toBe(false);
  });

  test('t5 npm build fails', () => {
    const file = wf(`jobs:\n  smoke:\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n          cache: pnpm\n      - run: corepack enable\n      - uses: pnpm/action-setup@v4\n      - run: npm run build\n        working-directory: frontend\n      - run: test -f frontend/dist/index.html\n        working-directory: frontend\n      - run: cat frontend/dist/index.html\n`);
    const res = auditFiles([file]);
    expect(res.ok).toBe(false);
  });

  test('t6 missing corepack enable fails', () => {
    const file = wf(`jobs:\n  smoke:\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n          cache: pnpm\n      - uses: pnpm/action-setup@v4\n      - run: pnpm build\n        working-directory: frontend\n      - run: test -f frontend/dist/index.html\n        working-directory: frontend\n      - run: cat frontend/dist/index.html\n`);
    const res = auditFiles([file]);
    expect(res.ok).toBe(false);
  });

  test('t7 missing working-directory fails', () => {
    const file = wf(`jobs:\n  smoke:\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n          cache: pnpm\n      - run: corepack enable\n      - uses: pnpm/action-setup@v4\n      - run: pnpm build\n      - run: test -f frontend/dist/index.html\n        working-directory: frontend\n      - run: cat frontend/dist/index.html\n`);
    const res = auditFiles([file]);
    expect(res.ok).toBe(false);
  });

  test('t8 missing verify step fails', () => {
    const file = wf(`jobs:\n  smoke:\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n          cache: pnpm\n      - run: corepack enable\n      - uses: pnpm/action-setup@v4\n      - run: pnpm build\n        working-directory: frontend\n      - run: cat frontend/dist/index.html\n`);
    const res = auditFiles([file]);
    expect(res.ok).toBe(false);
  });

  test('t9 build job with needs pass', () => {
    const file = wf(`jobs:\n  build:\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n          cache: pnpm\n      - run: corepack enable\n      - uses: pnpm/action-setup@v4\n      - run: pnpm build\n        working-directory: frontend\n      - run: test -f frontend/dist/index.html\n        working-directory: frontend\n      - uses: actions/upload-artifact@v4\n        with:\n          name: frontend-dist\n          path: frontend/dist\n  smoke:\n    needs: build\n    steps:\n      - uses: actions/download-artifact@v4\n        with:\n          name: frontend-dist\n          path: frontend/dist\n      - run: ls frontend/dist\n`);
    const res = auditFiles([file]);
    expect(res.ok).toBe(true);
  });

  test('t10 matrix build artifacts pass', () => {
    const expr = '${{ matrix.node }}';
    const file = wf(
      [
        'jobs:',
        '  build:',
        '    strategy:',
        '      matrix:',
        '        node: [18,20]',
        '    steps:',
        '      - uses: actions/setup-node@v4',
        '        with:',
        `          node-version: ${expr}`,
        '          cache: pnpm',
        '      - run: corepack enable',
        '      - uses: pnpm/action-setup@v4',
        '      - run: pnpm build',
        '        working-directory: frontend',
        '      - run: test -f frontend/dist/index.html',
        '        working-directory: frontend',
        '      - uses: actions/upload-artifact@v4',
        '        with:',
        `          name: frontend-dist-${expr}`,
        '          path: frontend/dist',
        '  smoke:',
        '    needs: build',
        '    strategy:',
        '      matrix:',
        '        node: [18,20]',
        '    steps:',
        '      - uses: actions/download-artifact@v4',
        '        with:',
        `          name: frontend-dist-${expr}`,
        '          path: frontend/dist',
        '      - run: ls frontend/dist',
      ].join('\n'),
    );
    const res = auditFiles([file]);
    expect(res.ok).toBe(true);
  });

  test('t11 wrong cache fails', () => {
    const file = wf(`jobs:\n  smoke:\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n          cache: npm\n      - run: corepack enable\n      - uses: pnpm/action-setup@v4\n      - run: pnpm build\n        working-directory: frontend\n      - run: test -f frontend/dist/index.html\n        working-directory: frontend\n      - run: cat frontend/dist/index.html\n`);
    const res = auditFiles([file]);
    expect(res.ok).toBe(false);
  });

  test('t12 summary json returned', () => {
    const file = wf(`jobs:\n  smoke:\n    steps:\n      - run: ls frontend/dist\n`);
    const res = auditFiles([file]);
    expect(res.ok).toBe(false);
    const entries = Object.entries(res.files[file].jobs);
    expect(entries.length).toBe(1);
    expect(entries[0][1].errors.length).toBeGreaterThan(0);
  });
});
