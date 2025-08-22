import path from 'node:path';
import {spawnSync} from 'node:child_process';

const fixtures = path.resolve(__dirname, '__fixtures__');

function shellcheck(file: string) {
  return spawnSync('shellcheck', [path.join(fixtures, file)]);
}

test('all scripts pass shellcheck', () => {
  for (const file of ['install.sh', 'user-data.sh', 'auto-heal.sh']) {
    const res = shellcheck(file);
    if (res.error && res.error.code === 'ENOENT') {
      console.warn('shellcheck not installed');
      return;
    }
    if (res.status !== 0) {
      throw new Error(res.stderr.toString());
    }
  }
});
