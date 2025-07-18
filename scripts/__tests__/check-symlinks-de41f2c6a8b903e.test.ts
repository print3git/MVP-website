import fs from 'fs';
import os from 'os';
import path from 'path';
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

test('handles missing symlinked directory', () => {
  const link = path.join(tmpDir, 'missing-dir');
  fs.symlinkSync('no-such-dir', link, 'dir');
  const result = spawnSync('npx', [...tsNodeArgs, tmpDir], { encoding: 'utf8' });
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(1);
  expect(result.stderr).toContain(`broken symlink: ${link}`);
});
