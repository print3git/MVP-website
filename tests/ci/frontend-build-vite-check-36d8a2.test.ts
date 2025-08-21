import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const frontendDir = path.join(__dirname, '..', '..', 'frontend');
const distDir = path.join(frontendDir, 'dist');
const viteBin = path.join(frontendDir, 'node_modules', '.bin', 'vite');

function run(cmd: string, args: string[], cwd?: string) {
  return spawnSync(cmd, args, { cwd, encoding: 'utf8' });
}

beforeAll(() => {
  run('pnpm', ['add', '-D', 'vite', '--no-save', '--dir', frontendDir]);
});

describe('frontend build', () => {
  test('pnpm build outputs dist/index.html', () => {
    fs.rmSync(distDir, { recursive: true, force: true });
    const result = run('pnpm', ['build', '--prefix', 'frontend']);
    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(distDir, 'index.html'))).toBe(true);
  });

  test('fails when vite is missing', () => {
    const pkgPath = path.join(frontendDir, 'package.json');
    const original = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const withoutVite = { ...original, devDependencies: { ...original.devDependencies } };
    delete withoutVite.devDependencies.vite;
    fs.writeFileSync(pkgPath, JSON.stringify(withoutVite, null, 2));
    fs.rmSync(path.join(frontendDir, 'node_modules'), { recursive: true, force: true });
    try {
      const result = run('pnpm', ['build', '--prefix', 'frontend']);
      expect(result.status).not.toBe(0);
      expect(result.stderr || result.stdout).toMatch(/vite/);
    } finally {
      fs.writeFileSync(pkgPath, JSON.stringify(original, null, 2));
      run('pnpm', ['add', '-D', `vite@${original.devDependencies.vite}`, '--no-save', '--dir', frontendDir]);
    }
  });

  test('logs clear error when dist missing', () => {
    fs.rmSync(distDir, { recursive: true, force: true });
    fs.mkdirSync(distDir, { recursive: true });
    expect(() => require('../../scripts/assert-frontend-dist.js')).toThrow(
      /Missing index.html/,
    );
  });
});

