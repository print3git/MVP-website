import { execa } from 'execa';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';

const tmpFile = join(process.cwd(), 'tmp-eslint.ts');
await writeFile(tmpFile, 'const answer: number = 42;\n');
const { stdout } = await execa('npx', [
  '--no-install',
  'eslint',
  '--rule',
  'no-unused-vars:off',
  tmpFile,
]);
await unlink(tmpFile);
process.stdout.write(stdout);
