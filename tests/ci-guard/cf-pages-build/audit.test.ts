import { mkdtempSync, writeFileSync, mkdirSync } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { auditRepo } from '../../../scripts/ci-guard/cf-pages-build/audit';

function setupRepo(wrangler: string, workflow: string): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'cf-pages-build-'));
  writeFileSync(path.join(dir, 'wrangler.toml'), wrangler);
  const wfDir = path.join(dir, '.github', 'workflows');
  mkdirSync(wfDir, { recursive: true });
  writeFileSync(path.join(wfDir, 'pages-deploy.yml'), workflow);
  return dir;
}

describe('cf-pages-build audit', () => {
  const wranglerBlock = `# >>> BEGIN MANAGED BLOCK: ci-guard:cf-pages-build\n[build]\n  # Use Corepack + pnpm to build the frontend\n  command = "bash -lc 'corepack enable && pnpm -C frontend install --frozen-lockfile && pnpm -C frontend build'"\n[pages]\n  build_output_dir = "frontend/dist"\n# <<< END MANAGED BLOCK: ci-guard:cf-pages-build\n`;

  test('passes with correct config', () => {
    const repo = setupRepo(
      `name = "x"\n${wranglerBlock}`,
      `# >>> BEGIN MANAGED BLOCK: ci-guard:cf-pages-build\nname: Pages Deploy\non: [push, pull_request]\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - run: corepack enable\n      - run: pnpm -C frontend install --frozen-lockfile && pnpm -C frontend build\n      - run: test -f frontend/dist/index.html\n      - uses: cloudflare/wrangler-action@v3\n        with:\n          command: pages deploy --project-name \\\"myproj\\\" --branch \\\"main\\\"\n# <<< END MANAGED BLOCK: ci-guard:cf-pages-build\n`
    );
    const res = auditRepo(repo);
    expect(res.ok).toBe(true);
  });

  test('fails without verify step', () => {
    const repo = setupRepo(
      `name = "x"\n${wranglerBlock}`,
      `# >>> BEGIN MANAGED BLOCK: ci-guard:cf-pages-build\nname: Pages Deploy\non: [push, pull_request]\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - run: corepack enable\n      - run: pnpm -C frontend install --frozen-lockfile && pnpm -C frontend build\n      - uses: cloudflare/wrangler-action@v3\n        with:\n          command: pages deploy --project-name \\\"myproj\\\" --branch \\\"main\\\"\n# <<< END MANAGED BLOCK: ci-guard:cf-pages-build\n`
    );
    const res = auditRepo(repo);
    expect(res.ok).toBe(false);
  });
});
