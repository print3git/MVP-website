import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawnSync } from 'child_process';

const fsPromises = fs.promises;
let tmpDir: string;
const script = path.join('scripts', 'check-broken-symlinks-9ac8f74db5e1c32.ts');
const tsNodeArgs = [
  '-y',
  'ts-node',
  '--transpile-only',
  '--compiler-options',
  JSON.stringify({ module: 'CommonJS', moduleResolution: 'node' }),
  script,
];

beforeEach(async () => {
  tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'symlink-test-'));
});

afterEach(async () => {
  await fsPromises.rm(tmpDir, { recursive: true, force: true });
});

describe('check-broken-symlinks script', () => {
  test('ignores valid symlink', () => {
    const target = path.join(tmpDir, 'file.txt');
    fs.writeFileSync(target, 'data');
    const link = path.join(tmpDir, 'valid-link');
    fs.symlinkSync(target, link);
    const result = spawnSync('npx', [...tsNodeArgs, tmpDir], { encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe('No broken symlinks or permission issues detected.');
    expect(result.stderr).toBe('');
  });

  test('detects broken symlink', () => {
    const link = path.join(tmpDir, 'broken-link');
    fs.symlinkSync('missing.txt', link);
    const result = spawnSync('npx', [...tsNodeArgs, tmpDir], { encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`broken symlink: ${link}`);
  });

  test('detects circular symlink', () => {
    const a = path.join(tmpDir, 'a');
    const b = path.join(tmpDir, 'b');
    fs.symlinkSync(b, a);
    fs.symlinkSync(a, b);
    const result = spawnSync('npx', [...tsNodeArgs, tmpDir], { encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`broken symlink: ${a}`);
  });

  test('skips regular file', () => {
    const file = path.join(tmpDir, 'regular.txt');
    fs.writeFileSync(file, 'content');
    const result = spawnSync('npx', [...tsNodeArgs, tmpDir], { encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe('No broken symlinks or permission issues detected.');
  });
});
